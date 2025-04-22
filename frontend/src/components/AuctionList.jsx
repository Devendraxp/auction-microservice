import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Card from './ui/Card'
import Button from './ui/Button'
import Container from './ui/Container'

// Get API URL from environment variables
const AUCTION_SERVICE_URL = import.meta.env.VITE_AUCTION_SERVICE_URL

const AuctionList = () => {
  // State for auctions list
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load auctions when component mounts
  useEffect(() => {
    fetchAuctions()
  }, [])

  // Function to fetch auctions from API
  const fetchAuctions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${AUCTION_SERVICE_URL}/auctions`)
      const data = await response.json()
      if (data.success) {
        setAuctions(data.auctions)
      } else {
        setError('Failed to load auctions')
      }
    } catch (err) {
      setError('Error connecting to server')
      console.error('Error fetching auctions:', err)
    } finally {
      setLoading(false)
    }
  }

  // Format date string for display
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Browse All Auctions</h1>
        <p className="text-gray-600">Discover and bid on exciting items from our community</p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <Link to="/create-auction">
          <Button>+ Create New Auction</Button>
        </Link>
        <Button variant="secondary" size="sm" onClick={fetchAuctions}>
          Refresh List
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-10">
          <p className="text-lg text-gray-500">Loading auctions...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      ) : auctions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map((auction) => (
            <Card key={auction._id} className="hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold mb-2">{auction.title}</h3>
              <p className="text-gray-600 mb-3 line-clamp-2">{auction.description}</p>
              <div className="text-sm text-gray-500 mb-4">
                <div className="mb-1">Start: {formatDate(auction.startTime)}</div>
                <div className="mb-1">End: {formatDate(auction.endTime)}</div>
                <div>Status: <span className="capitalize">{auction.status}</span></div>
              </div>
              <Link to={`/auctions/${auction._id}`}>
                <Button variant="outline" size="sm" className="w-full">
                  View Details
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-500 mb-4">No auctions available at the moment.</p>
          <Link to="/create-auction">
            <Button>Create your first auction</Button>
          </Link>
        </div>
      )}
    </div>
  )
}

export default AuctionList