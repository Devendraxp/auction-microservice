import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Card from './ui/Card'
import Button from './ui/Button'
import Input from './ui/Input'
import { io } from 'socket.io-client'

// Get API URLs from environment variables
const AUCTION_SERVICE_URL = import.meta.env.VITE_AUCTION_SERVICE_URL
const BID_SERVICE_URL = import.meta.env.VITE_BID_SERVICE_URL

// Get WebSocket URL - simplify to use the current host with explicit socket.io path
const getWebSocketUrl = () => {
  // In container/production environment, use the same host as the current page
  // Socket.io client will handle the path separately
  return window.location.origin
}

const WEBSOCKET_SERVICE_URL = getWebSocketUrl()

// Bid cooldown time in seconds
const BID_COOLDOWN_TIME = 15

const AuctionDetail = () => {
  const { id } = useParams()
  
  // State for auction details
  const [auction, setAuction] = useState(null)
  const [bids, setBids] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [socketConnected, setSocketConnected] = useState(false)
  const [socketConfirmed, setSocketConfirmed] = useState(false)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  
  // State for bid cooldown
  const [bidCooldown, setBidCooldown] = useState(0)
  const cooldownIntervalRef = useRef(null)
  
  // State for new bid
  const [newBid, setNewBid] = useState({
    amount: '',
    username: `User${Math.floor(1000 + Math.random() * 9000)}`, // Random 4-digit username for uniqueness
    sessionId: `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` // Unique session ID
  })
  
  // State for websocket
  const [socket, setSocket] = useState(null)
  const [lastBidUpdate, setLastBidUpdate] = useState(null)
  // Add auto-refresh interval reference
  const bidRefreshIntervalRef = useRef(null)

  // Function to fetch bids - extracted so we can reuse it
  const fetchBids = useCallback(async () => {
    try {
      console.log('Fetching bids from API...')
      const response = await fetch(`${BID_SERVICE_URL}/bids/${id}`)
      const data = await response.json()
      if (data.success) {
        console.log('Bids fetched successfully:', data.bids.length)
        
        // Process incoming bids to avoid duplicates
        const uniqueBids = removeDuplicateBids(data.bids)
        setBids(uniqueBids)
      } else {
        console.log('No bids found for this auction')
      }
    } catch (err) {
      console.error('Error fetching bids:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  // Helper function to remove duplicate bids based on ID or combination of fields
  const removeDuplicateBids = (bidsList) => {
    const uniqueBidsMap = new Map()
    bidsList.forEach((bid) => {
      // Create a unique key using either the ID or a combination of fields
      const bidKey = bid._id || `${bid.username}-${bid.amount}-${bid.placedAt}`
      // Only add this bid if we haven't seen this key before
      if (!uniqueBidsMap.has(bidKey)) {
        uniqueBidsMap.set(bidKey, bid)
      }
    })
    return Array.from(uniqueBidsMap.values())
  }

  // Start bid cooldown timer
  const startBidCooldown = useCallback(() => {
    // Clear any existing interval
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current)
    }
    
    // Set initial cooldown time
    setBidCooldown(BID_COOLDOWN_TIME)
    
    // Create interval to count down
    cooldownIntervalRef.current = setInterval(() => {
      setBidCooldown(prevCooldown => {
        if (prevCooldown <= 1) {
          clearInterval(cooldownIntervalRef.current)
          return 0
        }
        return prevCooldown - 1
      })
    }, 1000)
  }, [])

  // Load auction details
  useEffect(() => {
    const fetchAuction = async () => {
      try {
        const response = await fetch(`${AUCTION_SERVICE_URL}/auctions/${id}`)
        const data = await response.json()
        if (data.success) {
          setAuction(data.auction)
        } else {
          setError('Failed to load auction details')
        }
      } catch (err) {
        setError('Error connecting to server')
        console.error('Error fetching auction details:', err)
      }
    }
    
    fetchAuction()
    fetchBids()
    
    // Set up automatic bid refresh every 2 seconds
    bidRefreshIntervalRef.current = setInterval(() => {
      fetchBids()
    }, 2000)
    
    // Cleanup timers on unmount
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current)
      }
      if (bidRefreshIntervalRef.current) {
        clearInterval(bidRefreshIntervalRef.current)
      }
    }
  }, [id, fetchBids])
  
  // Setup Socket.IO connection in a separate useEffect
  useEffect(() => {
    // Only setup socket if we have an auction ID
    if (!id) return
    
    console.log(`Setting up WebSocket connection to ${WEBSOCKET_SERVICE_URL} for auction ${id}`)
    
    // Setup Socket.IO connection with improved connection settings
    const socketClient = io(WEBSOCKET_SERVICE_URL, {
      query: { auctionId: id },
      path: '/socket.io',
      transports: ['websocket', 'polling'], // Try websocket first, fall back to polling
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 30000,
      forceNew: true,  // Always force a new connection to avoid stale connections
      autoConnect: true
    })
    
    socketClient.on('connect', () => {
      console.log('Socket.IO connection established successfully')
      setSocketConnected(true)
      
      // Send a ping to keep the connection alive
      const pingInterval = setInterval(() => {
        if (socketClient.connected) {
          console.log('Sending ping to keep WebSocket connection alive')
          socketClient.emit('ping')
        } else {
          clearInterval(pingInterval)
        }
      }, 20000)
      
      // Clear the interval when the component unmounts
      return () => clearInterval(pingInterval)
    })
    
    socketClient.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error)
      setSocketConnected(false)
      setSocketConfirmed(false)
      // Track connection attempts for debugging
      setConnectionAttempts(prev => prev + 1)
    })
    
    socketClient.on('roomJoined', (data) => {
      console.log('Room joined confirmation received:', data)
      setSocketConfirmed(true)
    })
    
    // Listen to both event names for compatibility
    const handleBidUpdate = (bidData) => {
      console.log('Received bid update via WebSocket:', bidData)
      
      if (bidData && bidData.auctionId === id) {
        // Prevent duplicate updates by checking timestamp
        if (lastBidUpdate && 
            lastBidUpdate.placedAt === bidData.placedAt && 
            lastBidUpdate.username === bidData.username && 
            lastBidUpdate.amount === bidData.amount) {
          console.log('Duplicate bid update detected, ignoring')
          return
        }
        
        setLastBidUpdate(bidData)
        
        setBids(prevBids => {
          // Check if this bid already exists in our list
          const exists = prevBids.some(bid => 
            bid._id === bidData._id || 
            (bid.username === bidData.username && 
             bid.amount === bidData.amount && 
             bid.placedAt === bidData.placedAt)
          )
          
          if (exists) {
            console.log('Bid already exists in state, not adding again')
            return prevBids
          }
          
          console.log('Adding new bid to state')
          return [bidData, ...prevBids]
        })
      }
    }
    
    socketClient.on('bidUpdate', handleBidUpdate)
    socketClient.on('bidUpdated', handleBidUpdate)

    socketClient.on('bidCooldown', (cooldownData) => {
      console.log('Received bid cooldown broadcast:', cooldownData)
      if (cooldownData && cooldownData.auctionId === id) {
        startBidCooldown()
      }
    })
    
    socketClient.on('error', (error) => {
      console.error('Socket.IO error:', error)
      setSocketConfirmed(false)
    })
    
    socketClient.on('disconnect', () => {
      console.log('Socket.IO connection closed')
      setSocketConnected(false)
      setSocketConfirmed(false)
    })
    
    // Save socket to state
    setSocket(socketClient)
    
    // Cleanup function to disconnect socket when component unmounts
    return () => {
      if (socketClient) {
        console.log('Disconnecting websocket')
        socketClient.disconnect()
        setSocketConnected(false)
        setSocketConfirmed(false)
      }
    }
  }, [id, connectionAttempts, lastBidUpdate]) // Re-run if auction ID changes or we have connection attempts
  
  // Handle input change for new bid
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewBid({
      ...newBid,
      [name]: value
    })
  }
  
  // Submit new bid
  const handleSubmitBid = async (e) => {
    e.preventDefault()
    
    if (!newBid.amount || isNaN(newBid.amount) || parseFloat(newBid.amount) <= 0) {
      setError('Please enter a valid bid amount')
      return
    }
    
    try {
      console.log('Submitting bid to API:', {
        ...newBid,
        amount: parseFloat(newBid.amount),
        auctionId: id
      })
      
      const response = await fetch(`${BID_SERVICE_URL}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newBid,
          amount: parseFloat(newBid.amount),
          auctionId: id
        }),
      })
      
      const data = await response.json()
      if (data.success) {
        console.log('Bid submitted successfully:', data)
        // Clear bid input
        setNewBid({
          ...newBid,
          amount: ''
        })
        setError('')
        
        // Start the cooldown timer locally
        startBidCooldown()
        
        // Broadcast the cooldown to all other clients
        if (socketConnected && socketConfirmed && socket) {
          socket.emit('bidCooldown', { 
            auctionId: id,
            seconds: BID_COOLDOWN_TIME,
            timestamp: Date.now()
          })
        }
        
        // If there's no active WebSocket connection, fetch bids manually
        if (!socketConnected || !socketConfirmed) {
          console.log('Socket not confirmed, fetching bids manually')
          fetchBids()
        }
      } else {
        setError(data.error || 'Failed to place bid')
      }
    } catch (err) {
      setError('Error connecting to server')
      console.error('Error placing bid:', err)
    }
  }
  
  // Format date string for display
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }
  
  // Format bid amount as currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }
  
  if (loading) {
    return <div>Loading auction details...</div>
  }
  
  if (!auction && !loading) {
    return (
      <div>
        <p className="text-red-600">Auction not found</p>
        <Link to="/">
          <Button variant="outline" className="mt-4">
            Back to Home
          </Button>
        </Link>
      </div>
    )
  }
  
  return (
    <div>
      <Link to="/auctions" className="text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back to All Auctions
      </Link>
      
      {/* WebSocket Connection Status */}
      <div className={`text-xs mb-2 ${socketConnected && socketConfirmed ? 'text-green-600' : 'text-green-400'}`}>
        {socketConnected && socketConfirmed 
          ? '● You are live! Updates will appear automatically' 
          : '○● You are live! Updates will appear in real time'}
      </div>
      
      {/* Auction Details */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">{auction.title}</h1>
        <Card>
          <div className="mb-4">
            <h2 className="font-semibold mb-2">Description:</h2>
            <p>{auction.description}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="font-semibold">Start Time:</h3>
              <p>{formatDate(auction.startTime)}</p>
            </div>
            <div>
              <h3 className="font-semibold">End Time:</h3>
              <p>{formatDate(auction.endTime)}</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold">Status:</h3>
            <p className="capitalize">{auction.status}</p>
          </div>
        </Card>
      </div>
      
      {/* Place Bid Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Place a Bid</h2>
        <Card>
          <form onSubmit={handleSubmitBid} className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium">
                Bid Amount ($)
              </label>
              <Input
                type="number"
                name="amount"
                value={newBid.amount}
                onChange={handleInputChange}
                required
                min="0.01"
                step="0.01"
                placeholder="Enter your bid amount"
                disabled={bidCooldown > 0}
              />
            </div>
            
            <div>
              <Button 
                type="submit"
                disabled={bidCooldown > 0}
                className={bidCooldown > 0 ? "opacity-70 cursor-not-allowed" : ""}
              >
                {bidCooldown > 0 ? (
                  <>
                    <span className="inline-block mr-1">⏱</span>
                    Wait {bidCooldown}s
                  </>
                ) : "Place Bid"}
              </Button>
            </div>
            
            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}
          </form>
        </Card>
      </div>
      
      {/* Bids Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Bids History</h2>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={fetchBids}
            title="Manually refresh bids"
          >
            Refresh Bids
          </Button>
        </div>
        
        {bids.length > 0 ? (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Username</th>
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bids.map((bid, index) => (
                    <tr key={index} className={index === 0 ? 'bg-blue-50' : ''}>
                      <td className="px-4 py-3">{bid.username}</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(bid.amount)}</td>
                      <td className="px-4 py-3">{formatDate(bid.placedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <p className="text-gray-500">No bids yet. Be the first to place a bid!</p>
        )}
      </div>
    </div>
  )
}

export default AuctionDetail