import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set in .env')
  process.exit(1)
}

const eventSchema = new mongoose.Schema({}, { strict: false, collection: 'eventmodels' })
const userSchema  = new mongoose.Schema({}, { strict: false, collection: 'usermodels' })

const UserModel  = mongoose.model('usermodel', userSchema)
const eventModel = mongoose.model('eventmodel', eventSchema)

// ⚠️ Tumhara actual location — Delhi, Yamuna Vihar area
// (pehle ye 28.6139, 77.2090 tha — Connaught Place, jo tumse 13km door hai)
const CITIES = {
  delhi: { lat: 28.6844, lng: 77.3295, state: 'DL', zip: '110053' }
}

const IMAGES = [
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80'
]

const SAMPLES = [
  { name: 'Rooftop Jazz Night',       category: 'music',     price: 500, type: 'music' },
  { name: 'Sunday Farmers Market',    category: 'food',      price: 0,   type: 'market' },
  { name: 'Open Mic Standup',         category: 'art',       price: 200, type: 'comedy' },
  { name: 'Weekend Football Match',   category: 'sports',    price: 0,   type: 'sports' },
  { name: 'React Meetup',             category: 'tech',      price: 0,   type: 'meetup' },
  { name: 'Community Cleanup',        category: 'community', price: 0,   type: 'volunteer' },
  { name: 'Indie Film Screening',     category: 'art',       price: 300, type: 'film' },
  { name: 'Street Food Crawl',        category: 'food',      price: 800, type: 'food' },
  { name: 'Morning Yoga in the Park', category: 'sports',    price: 100, type: 'wellness' },
  { name: 'Startup Pitch Night',      category: 'tech',      price: 400, type: 'startup' }
]

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]

// 2 km ke andar jitter — pehle 3 km tha
const jitter = (base, meters = 2000) => {
  const d = meters / 111000
  return base + (Math.random() * 2 - 1) * d
}

async function run() {
  await mongoose.connect(MONGODB_URI)
  console.log('connected')

  await UserModel.deleteMany({})
  await eventModel.deleteMany({})
  console.log('cleared users + events')

  const host = await UserModel.create({
    username: 'demo',
    email: 'demo@localvibe.app',
    password: await bcrypt.hash('demo1234', 12),
    followers: [],
    following: [],
    eventsJoined: [],
    eventsHosted: [],
    interested: []
  })
  console.log('created demo (username: demo / password: demo1234)')

  let created = 0
  for (const [cityName, coord] of Object.entries(CITIES)) {
    for (let i = 0; i < 10; i++) {   // 10 events per city
      const s = rand(SAMPLES)
      const starts = new Date()
      starts.setDate(starts.getDate() + Math.floor(Math.random() * 30))
      starts.setHours(17 + Math.floor(Math.random() * 5), 0, 0, 0)

      const lng = jitter(coord.lng)
      const lat = jitter(coord.lat)

      const ev = await eventModel.create({
        name: `${s.name} — ${cityName}`,
        description: `A ${s.category} event happening in ${cityName}. Join us!`,
        image: rand(IMAGES),
        category: s.category,
        type: s.type,
        price: s.price,
        address: {
          street: `${Math.floor(Math.random() * 200) + 1} Demo Street`,
          city: cityName.charAt(0).toUpperCase() + cityName.slice(1),
          state: coord.state,
          zip: coord.zip,
          country: 'India',
          full: `${Math.floor(Math.random() * 200) + 1} Demo Street, ${cityName}, India`
        },
        location: {
          type: 'Point',
          coordinates: [lng, lat],
          lat,
          lng
        },
        total_seats: 10 + Math.floor(Math.random() * 40),
        host: host._id,
        status: 'offline',
        paid: s.price > 0,
        attendees: [host._id],
        interested: [],
        isFeatured: Math.random() < 0.25,
        startsAt: starts
      })

      host.eventsHosted.push(ev._id)
      host.eventsJoined.push(ev._id)
      created++
    }
  }

  await host.save()
  console.log(`created ${created} events across ${Object.keys(CITIES).length} cities`)

  await mongoose.disconnect()
  console.log('done')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})