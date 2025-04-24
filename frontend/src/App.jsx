import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar'
import Container from './components/ui/Container'
import HomePage from './components/HomePage'
import AuctionDetail from './components/AuctionDetail'
import AuctionList from './components/AuctionList'
import CreateAuction from './components/CreateAuction'
import Simulation from './components/Simulation'
import { SimulationProvider } from './contexts/SimulationContext'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="py-8">
          <Container>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/auctions" element={<AuctionList />} />
              <Route path="/auctions/:id" element={<AuctionDetail />} />
              <Route path="/create-auction" element={<CreateAuction />} />
              <Route path="/about" element={<div>About Page (Coming Soon)</div>} />
              <Route path="/simulation" element={
                <SimulationProvider>
                  <Simulation />
                </SimulationProvider>
              } />
            </Routes>
          </Container>
        </main>
      </div>
    </Router>
  )
}

export default App
