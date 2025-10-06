import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const signup = async (req, res) => {
  const { name, email, password, emergencyContact } = req.body;
  if (!name || !email || !password || !emergencyContact) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({ name, email, password, emergencyContact });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    // Establish the session
    req.session.user = { id: user.id };

    res.status(201).json({ 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emergencyContact: user.emergencyContact
      } 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Establish the session
    req.session.user = { id: user.id };
    
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emergencyContact: user.emergencyContact
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Could not log out.');
    }
    // Clear the cookie from the browser
    res.clearCookie('connect.sid'); 
    res.status(200).send('Logged out successfully');
  });
};