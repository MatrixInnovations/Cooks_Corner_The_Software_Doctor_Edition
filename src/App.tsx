import Header from './components/Header'
import Story from './components/Story'
import { Catering, Delivery, Footer, Menu, Policies, Packages, Subscriptions } from './components/Sections'
import Reviews from './components/Reviews'
import Chef from './components/Chef'
import { OrderProvider } from './components/ui'

export default function App() {
  return (
    <OrderProvider>
      <a className="skip" href="#packages">Skip to packages</a>
      <Header />
      <main>
        <Story />
        <Packages />
        <Menu />
        <Delivery />
        <Subscriptions />
        <Catering />
        <Reviews />
        <Chef />
        <Policies />
      </main>
      <Footer />
    </OrderProvider>
  )
}
