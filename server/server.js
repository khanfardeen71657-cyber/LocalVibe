import 'dotenv/config'
import mongoose from 'mongoose'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const app = express()
app.use(express.json())
app.use(cors({ origin: '*' }))

const expiration = '7d'
const Secret_Key = process.env.JWT_SECRET || 'dev-secret-change-me'
const MONGODB_URI = process.env.MONGODB_URI

// ─────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────
const eventSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  image:       { type: String, trim: true },
  category:    { type: String, enum: ['music','sports','food','art','tech','community','other'], default: 'other', index: true },
  price:       { type: Number, default: 0, min: 0 },
  address: {
    street:  { type: String, trim: true },
    city:    { type: String, trim: true },
    state:   { type: String, trim: true },
    zip:     { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    full:    { type: String, trim: true }
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v) =>
          Array.isArray(v) && v.length === 2 &&
          typeof v[0] === 'number' && typeof v[1] === 'number' &&
          v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90,
        message: 'coordinates must be [lng, lat] with valid ranges'
      }
    },
    lat: { type: Number },
    lng: { type: Number }
  },
  total_seats: { type: Number, required: true, min: 1 },
  host:        { type: mongoose.Schema.Types.ObjectId, ref: 'usermodel', required: true },
  status:      { type: String, enum: ['online', 'offline'], default: 'offline' },
  paid:        { type: Boolean, default: false },
  attendees:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'usermodel' }],
  interested:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'usermodel' }],
  isFeatured:  { type: Boolean, default: false, index: true },
  startsAt:    { type: Date, index: true },
  endsAt:      { type: Date },
  created_At:  { type: Date, default: Date.now }
})

eventSchema.index({ location: '2dsphere' })

// ✅ Mongoose 9 compatible — async function, no next
eventSchema.pre('save', async function () {
  if (this.address) {
    const parts = [
      this.address.street,
      this.address.city,
      this.address.state,
      this.address.zip,
      this.address.country
    ].filter(Boolean)
    this.address.full = parts.join(', ')
  }
  if (Array.isArray(this.location?.coordinates) && this.location.coordinates.length === 2) {
    this.location.lng = this.location.coordinates[0]
    this.location.lat = this.location.coordinates[1]
  }
  this.paid = Number(this.price || 0) > 0
})

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar:   { type: String, trim: true },
  followers:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'usermodel' }],
  following:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'usermodel' }],
  eventsJoined: [{ type: mongoose.Schema.Types.ObjectId, ref: 'eventmodel' }],
  eventsHosted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'eventmodel' }],
  interested:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'eventmodel' }],
  location: String,
  created_At: { type: Date, default: Date.now }
})

const UserModel = mongoose.model('usermodel', UserSchema)
const eventModel = mongoose.model('eventmodel', eventSchema)

// ─────────────────────────────────────────────────────────────
// DB
// ─────────────────────────────────────────────────────────────
async function connectdb() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('database connected')
    await eventModel.syncIndexes()
    console.log('indexes synced')
  } catch (error) {
    console.error('DB connection error:', error)
  }
}
connectdb()

// ─────────────────────────────────────────────────────────────
// AUTH MIDDLEWARE
// ─────────────────────────────────────────────────────────────
function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header) return res.status(401).json({ message: 'no token provided' })
    const parts = header.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ message: 'invalid token format' })
    }
    req.user = jwt.verify(parts[1], Secret_Key)
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ message: 'token expired' })
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ message: 'invalid token' })
    return res.status(500).json({ message: 'internal server error' })
  }
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function formatFriendsMessage(friends) {
  if (!friends || !friends.length) return null
  const names = friends.map(f => f.username)
  if (names.length === 1) return `${names[0]} joined this event`
  if (names.length === 2) return `${names[0]} and ${names[1]} joined this event`
  return `${names[0]}, ${names[1]} and ${names.length - 2} others joined this event`
}

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

function normalizeAddress(raw) {
  if (!raw) return {}
  if (typeof raw === 'string') return { street: raw.trim() }
  const { street, city, state, zip, country } = raw
  return {
    street:  street?.trim(),
    city:    city?.trim(),
    state:   state?.trim(),
    zip:     zip?.trim(),
    country: country?.trim() || 'India'
  }
}

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80'
]

function fallbackImage(seed) {
  const s = String(seed || '')
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length]
}

// ─────────────────────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────────────────────
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email and password required' })
    }
    const exists = await UserModel.findOne({ $or: [{ username }, { email }] })
    if (exists) return res.status(409).json({ message: 'user already exists' })
    const document = await UserModel.create({
      username, email,
      password: await bcrypt.hash(password, 12)
    })
    const token = jwt.sign(
      { id: document._id, username: document.username },
      Secret_Key,
      { expiresIn: expiration }
    )
    res.status(201).json({ message: 'account created successfully', token })
  } catch (error) {
    console.error('REGISTER ERROR:', error)
    res.status(500).json({ message: 'internal server error', detail: error.message })
  }
})

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username) return res.status(400).json({ message: 'username required' })
    if (!password) return res.status(400).json({ message: 'password required' })
    const user = await UserModel.findOne({ username })
    if (!user) return res.status(404).json({ message: 'user not found' })
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ message: 'incorrect password' })
    const token = jwt.sign(
      { id: user._id, username: user.username },
      Secret_Key,
      { expiresIn: expiration }
    )
    res.json({ message: 'login successful', token })
  } catch (error) {
    console.error('LOGIN ERROR:', error)
    res.status(500).json({ message: 'internal server error', detail: error.message })
  }
})

// ─────────────────────────────────────────────────────────────
// USER ROUTES
// ─────────────────────────────────────────────────────────────
app.get('/me', authenticate, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id)
      .select('-password')
      .populate('following', 'username avatar')
      .populate('followers', 'username avatar')
      .populate('eventsJoined')
      .populate('eventsHosted')
      .populate('interested')
    if (!user) return res.status(404).json({ message: 'user not found' })
    res.json({ user })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

app.patch('/me', authenticate, async (req, res) => {
  try {
    const { avatar } = req.body
    const user = await UserModel.findByIdAndUpdate(
      req.user.id,
      { avatar: avatar !== undefined ? avatar : undefined },
      { new: true }
    ).select('-password')
    if (!user) return res.status(404).json({ message: 'user not found' })
    res.json({ user })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

app.get('/users/search', authenticate, async (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    if (!q) return res.json({ users: [] })
    const users = await UserModel.find({
      username: { $regex: q, $options: 'i' }
    })
      .select('username avatar _id')
      .limit(20)
    res.json({ users })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

app.get('/user/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'invalid user id' })
    }
    const user = await UserModel.findById(req.params.id)
      .select('-password')
      .populate('following', 'username avatar')
      .populate('followers', 'username avatar')
      .populate('eventsJoined')
      .populate('eventsHosted')
    if (!user) return res.status(404).json({ message: 'user not found' })
    res.json({ user })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

app.post('/follow', authenticate, async (req, res) => {
  try {
    const { userToFollow } = req.body
    if (!userToFollow) return res.status(400).json({ message: 'userToFollow required' })
    const me = await UserModel.findById(req.user.id)
    const target = await UserModel.findOne({ username: userToFollow })
    if (!me || !target) return res.status(404).json({ message: 'user not found' })
    if (String(me._id) === String(target._id)) {
      return res.status(400).json({ message: 'cannot follow yourself' })
    }
    if (me.following.some(id => id.equals(target._id))) {
      return res.status(409).json({ message: 'already following' })
    }
    me.following.push(target._id)
    target.followers.push(me._id)
    await me.save()
    await target.save()
    res.json({ message: 'followed' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

app.post('/unfollow', authenticate, async (req, res) => {
  try {
    const { userToUnfollow } = req.body
    if (!userToUnfollow) return res.status(400).json({ message: 'userToUnfollow required' })
    const me = await UserModel.findById(req.user.id)
    const target = await UserModel.findOne({ username: userToUnfollow })
    if (!me || !target) return res.status(404).json({ message: 'user not found' })
    me.following.pull(target._id)
    target.followers.pull(me._id)
    await me.save()
    await target.save()
    res.json({ message: 'unfollowed' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

// ─────────────────────────────────────────────────────────────
// EVENT ROUTES
// ─────────────────────────────────────────────────────────────

app.post('/events', authenticate, async (req, res) => {
  try {
    const {
      name, description, image, category, price,
      address, street, city, state, zip, country,
      lng, lat, total_seats, status, type, startsAt, endsAt
    } = req.body

    if (!name || String(name).trim() === '') {
      return res.status(400).json({ message: 'name is required' })
    }
    if (lng == null || isNaN(Number(lng))) {
      return res.status(400).json({ message: 'lng is required and must be a number', received: lng })
    }
    if (lat == null || isNaN(Number(lat))) {
      return res.status(400).json({ message: 'lat is required and must be a number', received: lat })
    }
    if (!total_seats || Number(total_seats) < 1) {
      return res.status(400).json({ message: 'total_seats must be at least 1' })
    }

    const user = await UserModel.findById(req.user.id)
    if (!user) return res.status(404).json({ message: 'user not found' })

    const addressInput = typeof address === 'object' && address !== null
      ? address
      : { street: address || street, city, state, zip, country }

    const event = await eventModel.create({
      name: String(name).trim(),
      description: description ? String(description).trim() : undefined,
      image: image || fallbackImage(name),
      category: category || 'other',
      price: Number(price) || 0,
      address: normalizeAddress(addressInput),
      location: {
        type: 'Point',
        coordinates: [Number(lng), Number(lat)],
        lat: Number(lat),
        lng: Number(lng)
      },
      total_seats: Number(total_seats),
      status: status || 'offline',
      type: type ? String(type).trim() : undefined,
      startsAt: startsAt ? new Date(startsAt) : undefined,
      endsAt: endsAt ? new Date(endsAt) : undefined,
      host: user._id,
      attendees: [user._id]
    })

    user.eventsHosted.push(event._id)
    user.eventsJoined.push(event._id)
    await user.save()

    res.status(201).json({ message: 'event created', event })
  } catch (error) {
    console.error('EVENT CREATE ERROR:', error)
    res.status(500).json({
      message: 'internal server error',
      detail: error.message
    })
  }
})

app.get('/events', async (req, res) => {
  try {
    const events = await eventModel.find()
      .populate('host', 'username avatar')
      .sort({ startsAt: 1 })
      .limit(100)
    res.json({ count: events.length, events })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

app.get('/events/recommended', authenticate, async (req, res) => {
  try {
    const { lng, lat, radius = 20000 } = req.query
    if (lng == null || lat == null) {
      return res.status(400).json({ message: 'lng and lat required' })
    }
    const me = await UserModel.findById(req.user.id).select('eventsJoined')
    if (!me || !me.eventsJoined.length) {
      return res.json({ count: 0, events: [], reason: 'no history' })
    }
    const past = await eventModel.find({ _id: { $in: me.eventsJoined } }).select('category')
    const myCategories = [...new Set(past.map(e => e.category).filter(Boolean))]
    if (!myCategories.length) {
      return res.json({ count: 0, events: [], reason: 'no categories' })
    }
    const events = await eventModel.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          distanceField: 'distanceMeters',
          maxDistance: Number(radius),
          spherical: true,
          query: {
            category: { $in: myCategories },
            _id: { $nin: me.eventsJoined },
            $or: [
              { startsAt: { $gte: new Date() } },
              { startsAt: { $exists: false } }
            ]
          }
        }
      },
      { $limit: 30 }
    ])
    await eventModel.populate(events, { path: 'host', select: 'username avatar' })
    res.json({
      count: events.length,
      events,
      reason: `Because you've joined ${myCategories.join(', ')} events`
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

app.get('/events/nearby', authenticate, async (req, res) => {
  try {
    const { lng, lat, radius = 5000, category, minPrice, maxPrice, from, to, featured } = req.query
    if (lng == null || lat == null) {
      return res.status(400).json({ message: 'lng and lat required' })
    }
    const query = {}
    if (category && category !== 'all') query.category = category
    if (featured === 'true') query.isFeatured = true
    if (minPrice != null || maxPrice != null) {
      query.price = {}
      if (minPrice != null) query.price.$gte = Number(minPrice)
      if (maxPrice != null) query.price.$lte = Number(maxPrice)
    }
    if (from || to) {
      query.startsAt = {}
      if (from) query.startsAt.$gte = new Date(from)
      if (to) query.startsAt.$lte = new Date(to)
    } else {
      query.$or = [
        { startsAt: { $gte: new Date() } },
        { startsAt: { $exists: false } }
      ]
    }
    const events = await eventModel.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          distanceField: 'distanceMeters',
          maxDistance: Number(radius),
          spherical: true,
          query
        }
      },
      { $sort: { isFeatured: -1, distanceMeters: 1 } },
      { $limit: 100 }
    ])
    await eventModel.populate(events, { path: 'host', select: 'username avatar' })
    res.json({ count: events.length, events })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

app.get('/events/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'invalid event id' })
    }
    const event = await eventModel.findById(req.params.id)
      .populate('host', 'username avatar')
      .populate('attendees', 'username avatar')
      .populate('interested', 'username avatar')
    if (!event) return res.status(404).json({ message: 'event not found' })
    res.json({ event })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

app.patch('/events/:id', authenticate, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'invalid event id' })
    }
    const event = await eventModel.findById(req.params.id)
    if (!event) return res.status(404).json({ message: 'event not found' })
    if (String(event.host) !== String(req.user.id)) {
      return res.status(403).json({ message: 'not the host' })
    }
    const {
      name, description, image, category, price,
      address, street, city, state, zip, country,
      lng, lat, total_seats, status, type, startsAt, endsAt
    } = req.body
    if (name !== undefined) event.name = name
    if (description !== undefined) event.description = description
    if (image !== undefined) event.image = image
    if (category !== undefined) event.category = category
    if (price !== undefined) event.price = Number(price)
    if (total_seats !== undefined) event.total_seats = total_seats
    if (status !== undefined) event.status = status
    if (type !== undefined) event.type = type
    if (startsAt !== undefined) event.startsAt = startsAt ? new Date(startsAt) : undefined
    if (endsAt !== undefined) event.endsAt = endsAt ? new Date(endsAt) : undefined
    if (address !== undefined || street !== undefined || city !== undefined) {
      const addressInput = typeof address === 'object'
        ? address : { street: address || street, city, state, zip, country }
      const n = normalizeAddress(addressInput)
      event.address = {
        street: n.street ?? event.address.street,
        city:   n.city   ?? event.address.city,
        state:  n.state  ?? event.address.state,
        zip:    n.zip    ?? event.address.zip,
        country: n.country ?? event.address.country
      }
    }
    if (lng != null && lat != null) {
      event.location = {
        type: 'Point',
        coordinates: [Number(lng), Number(lat)],
        lat: Number(lat), lng: Number(lng)
      }
    }
    await event.save()
    res.json({ message: 'event updated', event })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

app.patch('/events/:id/feature', authenticate, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'invalid event id' })
    }
    const event = await eventModel.findById(req.params.id)
    if (!event) return res.status(404).json({ message: 'event not found' })
    if (String(event.host) !== String(req.user.id)) {
      return res.status(403).json({ message: 'not the host' })
    }
    event.isFeatured = !!req.body.isFeatured
    await event.save()
    res.json({ message: 'updated', event })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

app.delete('/events/:id', authenticate, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'invalid event id' })
    }
    const event = await eventModel.findById(req.params.id)
    if (!event) return res.status(404).json({ message: 'event not found' })
    if (String(event.host) !== String(req.user.id)) {
      return res.status(403).json({ message: 'not the host' })
    }
    await UserModel.updateMany(
      { $or: [{ eventsJoined: event._id }, { eventsHosted: event._id }, { interested: event._id }] },
      { $pull: { eventsJoined: event._id, eventsHosted: event._id, interested: event._id } }
    )
    await eventModel.deleteOne({ _id: event._id })
    res.json({ message: 'event deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

app.post('/events/:id/join', authenticate, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'invalid event id' })
    }
    const event = await eventModel.findById(req.params.id)
    if (!event) return res.status(404).json({ message: 'event not found' })
    if (event.attendees.some(id => id.equals(req.user.id))) {
      return res.status(409).json({ message: 'already joined' })
    }
    if (event.attendees.length >= event.total_seats) {
      return res.status(409).json({ message: 'event is full' })
    }
    event.attendees.push(req.user.id)
    event.interested.pull(req.user.id)
    await event.save()
    await UserModel.findByIdAndUpdate(req.user.id, {
      $addToSet: { eventsJoined: event._id },
      $pull: { interested: event._id }
    })
    res.json({ message: 'joined event', event })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

app.post('/events/:id/interested', authenticate, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'invalid event id' })
    }
    const event = await eventModel.findById(req.params.id)
    if (!event) return res.status(404).json({ message: 'event not found' })
    const uid = req.user.id
    const already = event.interested.some(id => id.equals(uid))
    if (already) {
      event.interested.pull(uid)
      await event.save()
      await UserModel.findByIdAndUpdate(uid, { $pull: { interested: event._id } })
      return res.json({ message: 'interest removed', event })
    }
    event.attendees.pull(uid)
    event.interested.push(uid)
    await event.save()
    await UserModel.findByIdAndUpdate(uid, {
      $addToSet: { interested: event._id },
      $pull: { eventsJoined: event._id }
    })
    res.json({ message: 'marked interested', event })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

app.post('/events/:id/exit', authenticate, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'invalid event id' })
    }
    const event = await eventModel.findById(req.params.id)
    if (!event) return res.status(404).json({ message: 'event not found' })
    if (String(event.host) === String(req.user.id)) {
      return res.status(400).json({ message: 'host cannot exit — delete the event instead' })
    }
    event.attendees.pull(req.user.id)
    event.interested.pull(req.user.id)
    await event.save()
    await UserModel.findByIdAndUpdate(req.user.id, {
      $pull: { eventsJoined: event._id, interested: event._id }
    })
    res.json({ message: 'exited event' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

// ─────────────────────────────────────────────────────────────
// FEED ROUTES
// ─────────────────────────────────────────────────────────────
app.get('/feed', authenticate, async (req, res) => {
  try {
    const me = await UserModel.findById(req.user.id).select('following')
    if (!me) return res.status(404).json({ message: 'user not found' })
    if (!me.following.length) return res.json({ count: 0, feed: [] })

    const feed = await eventModel.aggregate([
      { $match: { attendees: { $in: me.following } } },
      {
        $lookup: {
          from: 'usermodels',
          let: { attendees: '$attendees' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$_id', '$$attendees'] },
                    { $in: ['$_id', me.following] }
                  ]
                }
              }
            },
            { $project: { _id: 1, username: 1, avatar: 1 } }
          ],
          as: 'friendsJoined'
        }
      },
      { $sort: { startsAt: 1 } },
      { $limit: 50 },
      {
        $project: {
          name: 1, description: 1, image: 1, category: 1, price: 1,
          address: 1, location: 1, isFeatured: 1,
          startsAt: 1, endsAt: 1, status: 1, paid: 1, type: 1,
          total_seats: 1,
          attendeeCount: { $size: '$attendees' },
          friendsJoined: 1
        }
      }
    ])

    const withText = feed.map(ev => ({
      ...ev,
      message: formatFriendsMessage(ev.friendsJoined)
    }))

    res.json({ count: withText.length, feed: withText })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

app.get('/feed/nearby', authenticate, async (req, res) => {
  try {
    const { lng, lat, radius = 5000 } = req.query
    if (lng == null || lat == null) {
      return res.status(400).json({ message: 'lng and lat required' })
    }
    const me = await UserModel.findById(req.user.id).select('following')
    if (!me || !me.following.length) return res.json({ count: 0, feed: [] })

    const feed = await eventModel.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          distanceField: 'distanceMeters',
          maxDistance: Number(radius),
          spherical: true,
          query: {
            attendees: { $in: me.following },
            $or: [
              { startsAt: { $gte: new Date() } },
              { startsAt: { $exists: false } }
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'usermodels',
          let: { attendees: '$attendees' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$_id', '$$attendees'] },
                    { $in: ['$_id', me.following] }
                  ]
                }
              }
            },
            { $project: { _id: 1, username: 1, avatar: 1 } }
          ],
          as: 'friendsJoined'
        }
      },
      { $limit: 50 }
    ])

    const withText = feed.map(ev => ({
      ...ev,
      message: formatFriendsMessage(ev.friendsJoined)
    }))

    res.json({ count: withText.length, feed: withText })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
})

// ─────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5050
app.listen(PORT, () => {
  console.log(`server listening on port ${PORT}`)
})