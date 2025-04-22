import { Link } from 'react-router-dom'
import Card from './ui/Card'
import Button from './ui/Button'

const HomePage = () => {
  return (
    <div>
      {/* Hero Section */}
      <div className="text-center py-12 mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-blue-700 mb-4">
          Welcome to the Distributed Auction Platform
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Discover, bid, and sell items in our secure and transparent real-time auction marketplace.
        </p>
      </div>
      
      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <Card className="flex flex-col items-center text-center p-8 bg-blue-50 border-blue-100">
          <div className="text-3xl text-blue-600 mb-4">🔍</div>
          <h2 className="text-2xl font-semibold mb-3">Browse Auctions</h2>
          <p className="text-gray-600 mb-6">
            Explore our diverse range of active auctions and place your bids to win exciting items.
          </p>
          <Link to="/auctions" className="mt-auto">
            <Button variant="primary" size="lg" className="w-full">
              Browse All Auctions
            </Button>
          </Link>
        </Card>
        
        <Card className="flex flex-col items-center text-center p-8 bg-green-50 border-green-100">
          <div className="text-3xl text-green-600 mb-4">✚</div>
          <h2 className="text-2xl font-semibold mb-3">Create an Auction</h2>
          <p className="text-gray-600 mb-6">
            List your items for auction and let our global community bid on them.
          </p>
          <Link to="/create-auction" className="mt-auto">
            <Button variant="primary" size="lg" className="w-full bg-green-600 hover:bg-green-700 focus:ring-green-500">
              Create New Auction
            </Button>
          </Link>
        </Card>
      </div>
      
      {/* How It Works Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4">
              <span className="font-bold text-blue-600">1</span>
            </div>
            <h3 className="font-semibold mb-2">Create or Browse</h3>
            <p className="text-gray-600">Create your own auction or browse existing ones to find items of interest.</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4">
              <span className="font-bold text-blue-600">2</span>
            </div>
            <h3 className="font-semibold mb-2">Place Bids</h3>
            <p className="text-gray-600">Submit your bids on active auctions and receive real-time updates.</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4">
              <span className="font-bold text-blue-600">3</span>
            </div>
            <h3 className="font-semibold mb-2">Win & Complete</h3>
            <p className="text-gray-600">If you're the highest bidder when an auction ends, you win the item!</p>
          </div>
        </div>
      </div>
      
      {/* Call to Action */}
      <Card className="bg-blue-600 text-white text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
        <p className="mb-6">Join our community of buyers and sellers today.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/auctions">
            <Button variant="secondary" size="lg">
              Browse Auctions
            </Button>
          </Link>
          <Link to="/create-auction">
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-blue-700">
              Create Auction
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default HomePage