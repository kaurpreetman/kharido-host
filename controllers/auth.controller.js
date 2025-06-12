import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const generateAccessToken = (userID) => {
  return jwt.sign({ userID }, `${process.env.ACCESS_TOKEN_SECRET}`, { expiresIn: '7d' });
};

const setAccessTokenCookie = (res, token, maxAge = 60 * 60 * 1000) => {
  res.cookie('accessToken', token, {
    httpOnly: true,
    secure: true, 
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

// ✅ SIGNUP
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email, and password are required.' });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(409).json({ message: 'Email already in use.' });

    const newUser = new User({ name, email, password });
    const savedUser = await newUser.save();

    const token = generateAccessToken(savedUser._id);
    setAccessTokenCookie(res, token);

    const { password: _, ...userWithoutPassword } = savedUser.toObject();
    res.status(201).json({ message: 'User registered successfully.', user: userWithoutPassword });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ✅ LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials.' });

    const token = generateAccessToken(user._id);
    setAccessTokenCookie(res, token);

    const { password: _, ...userWithoutPassword } = user.toObject();
    res.status(200).json({ message: 'Logged in successfully.', user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ✅ GOOGLE SIGN-IN (COOKIE BASED)
export const googleSignup = async (req, res) => {
  try {
    const { token } = req.body;

    const googleRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const { email, name, sub: googleId } = googleRes.data;

    if (!email || !googleId)
      return res.status(400).json({ message: 'Google token is invalid or expired.' });

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name, email, googleId });
    }

    const accessToken = generateAccessToken(user._id);
    setAccessTokenCookie(res, accessToken);

    const { password: _, ...userWithoutPassword } = user.toObject();
    res.status(200).json({ message: 'Google login successful.', user: userWithoutPassword });
  } catch (err) {
    console.error('Google Sign-In error:', err);
    res.status(401).json({ message: 'Unauthorized - Invalid token' });
  }
};

// ✅ ADMIN LOGIN (COOKIE BASED)
export const adminLogin = async (req, res) => {
  try {
  
    const {email, password}=req.body

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email });
    if (!user || user.role !== 'admin')
      return res.status(403).json({ message: 'Access denied. Admin only.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid credentials.' });

    const token = generateAccessToken(user._id);
    setAccessTokenCookie(res, token, 7 * 24 * 60 * 60 * 1000); // 7 days

    const { password: _, ...userWithoutPassword } = user.toObject();
    res.status(200).json({ success:true,message: 'Admin logged in successfully.', user: userWithoutPassword });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ✅ GET PROFILE
export const getProfile = async (req, res) => {
  try {
    res.status(200).json({ user: req.user });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// ✅ LOGOUT (Clears cookie)
export const logout = (req, res) => {
  try {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    });
    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
