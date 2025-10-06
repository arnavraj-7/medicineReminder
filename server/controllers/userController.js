import User from '../models/User.js';

/**
 * @route   GET /api/users/me
 * @desc    Get logged-in user's profile data
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    // req.user.id is attached by the 'auth' middleware
    const user = await User.findById(req.user.id).select('-password -refreshToken');
    if (!user) {
        return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

/**
 * @route   PUT /api/users/me
 * @desc    Update user's profile (name and emergency contact)
 * @access  Private
 */
export const updateProfile = async (req, res) => {
  const { name, emergencyContact } = req.body;
  const userId = req.user.id; // From auth middleware

  // Build the fields to update
  const updatedFields = {};
  if (name) updatedFields.name = name;
  if (emergencyContact) updatedFields.emergencyContact = emergencyContact;

  if (Object.keys(updatedFields).length === 0) {
    return res.status(400).json({ msg: 'No fields to update provided' });
  }

  try {
    // Find the user by ID and update their profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updatedFields },
      { new: true, runValidators: true } // 'new: true' returns the modified document
    ).select('-password -refreshToken'); // Exclude sensitive fields from the response

    if (!updatedUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
