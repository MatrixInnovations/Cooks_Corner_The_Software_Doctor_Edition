import Header from './components/Header'
import Story from './components/Story'
import { Catering, Delivery, Footer, Menu, Policies, Packages, Subscriptions } from './components/Sections'
import Reviews from './components/Reviews'
import Chef from './components/Chef'
import OrderReturn from './components/OrderReturn'
import TrayBuilder from './components/TrayBuilder'
import { FEATURES } from './config/features'
import { OrderProvider } from './components/ui'

export default function App() {
  return (
    <OrderProvider>
      <a className="skip" href="#packages">Skip to packages</a>
      <OrderReturn />
      <Header />
      <main>
        <Story />
        <Packages />
        {FEATURES.trayBuilder && <TrayBuilder />}
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
