import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Card from './ui/Card'
import Button from './ui/Button'
import Input from './ui/Input'

// Get API URL from environment variables
const AUCTION_SERVICE_URL = import.meta.env.VITE_AUCTION_SERVICE_URL

const CreateAuction = () => {
  const navigate = useNavigate()
  
  // State for auction form
  const [newAuction, setNewAuction] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    username: 'User123',  // Simple username for demo
    sessionId: 'session-123'  // Simple session ID for demo
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Handle input changes in auction form
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewAuction({
      ...newAuction,
      [name]: value
    })
  }

  // Create new auction
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${AUCTION_SERVICE_URL}/auctions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAuction),
      })

      const data = await response.json()
      if (data.success) {
        // Navigate to the auction list page on success
        navigate('/auctions')
      } else {
        setError(data.error || 'Failed to create auction')
      }
    } catch (err) {
      setError('Error connecting to server')
      console.error('Error creating auction:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Auction</h1>
        <p className="text-gray-600">List your item for bidding in our global marketplace</p>
      </div>
      
      <div className="flex mb-6">
        <Link to="/auctions">
          <Button variant="secondary" size="sm">
            &larr; Back to Auctions
          </Button>
        </Link>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 text-sm font-medium">
              Auction Title
            </label>
            <Input
              name="title"
              value={newAuction.title}
              onChange={handleInputChange}
              required
              placeholder="Enter a descriptive title for your auction"
            />
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium">
              Description
            </label>
            <textarea
              name="description"
              value={newAuction.description}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows="4"
              placeholder="Provide details about the item you're auctioning"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 text-sm font-medium">
                Start Time
              </label>
              <Input
                type="datetime-local"
                name="startTime"
                value={newAuction.startTime}
                onChange={handleInputChange}
                required
              />
              <p className="mt-1 text-xs text-gray-500">When the auction will start accepting bids</p>
            </div>
            
            <div>
              <label className="block mb-2 text-sm font-medium">
                End Time
              </label>
              <Input
                type="datetime-local"
                name="endTime"
                value={newAuction.endTime}
                onChange={handleInputChange}
                required
              />
              <p className="mt-1 text-xs text-gray-500">When the auction will close</p>
            </div>
          </div>
          
          <div className="pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Auction'}
            </Button>
            
            {error && (
              <p className="mt-4 text-red-600 text-sm">{error}</p>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}

export default CreateAuction