const express = require('express');
const router = express.Router();

module.exports = (db) => {
  /**
   * Update user information across Auth and Users tables
   */
  router.put('/update-user', async (req, res) => {
    // console.log('User update request received:', {
    //   body: req.body,
    //   timestamp: new Date().toISOString()
    // });

    const {
      auth_id,
      user_id,
      username,
      password,
      first_name,
      last_name,
      email,
      phone,
      profile_pic,
      role
    } = req.body;

    // Validate required fields
    if (!auth_id || !user_id) {
      console.error('Missing required IDs:', { auth_id, user_id });
      return res.status(400).json({
        error: 'Missing required fields: auth_id and user_id'
      });
    }

    try {
      await db.beginTransaction();

      // 1. Update Auth table
      const authUpdateParams = [username, role, auth_id];
      let authUpdateQuery = 'UPDATE Auth SET username = ?, role = ? WHERE auth_id = ?';

      if (password && password.trim() !== '') {
        authUpdateQuery = 'UPDATE Auth SET username = ?, password = ?, role = ? WHERE auth_id = ?';
        authUpdateParams.splice(1, 0, password);
      }

      const [authResult] = await db.query(authUpdateQuery, authUpdateParams);

      // 2. Update Users table
      const userUpdateQuery = `
        UPDATE Users 
        SET first_name = ?, last_name = ?, email = ?, phone = ?, profile_pic = ?
        WHERE user_id = ?
      `;
      const userUpdateParams = [first_name, last_name, email, phone, profile_pic, user_id];
      const [userResult] = await db.query(userUpdateQuery, userUpdateParams);

      await db.commit();

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        auth_affected: authResult.affectedRows,
        user_affected: userResult.affectedRows
      });

    } catch (error) {
      await db.rollback();
      console.error('Error during user update:', error.message);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  router.put('/update-client', async (req, res) => {
    const {
      auth_id,
      client_id,
      username,
      password,
      company_name,
      contact_person,
      email,
      gstin,
      pan_number,
      profile_pic,
      contacts = []
    } = req.body;

    if (!auth_id || !client_id) {
      return res.status(400).json({ error: 'Missing required IDs' });
    }

    try {
      await db.beginTransaction();

      // 1. Update Auth table
      const authUpdateParams = [username, auth_id];
      let authUpdateQuery = 'UPDATE Auth SET username = ? WHERE auth_id = ?';

      if (password && password.trim() !== '') {
        authUpdateQuery = 'UPDATE Auth SET username = ?, password = ? WHERE auth_id = ?';
        authUpdateParams.splice(1, 0, password);
      }

      const [authResult] = await db.query(authUpdateQuery, authUpdateParams);

      // 2. Update Clients table
      const clientUpdateQuery = `
        UPDATE Clients 
        SET company_name = ?, contact_person = ?, email = ?, gstin = ?, pan_number = ?, profile_pic = ?
        WHERE client_id = ?
      `;
      const clientUpdateParams = [company_name, contact_person, email, gstin || null, pan_number || null, profile_pic, client_id];
      const [clientResult] = await db.query(clientUpdateQuery, clientUpdateParams);

      // 3. Update ClientContacts
      await db.query('DELETE FROM ClientContacts WHERE client_id = ?', [client_id]);

      if (contacts.length > 0) {
        const contactValues = contacts.map(contact => [client_id, contact.contact_name, contact.phone, contact.email]);
        await db.query('INSERT INTO ClientContacts (client_id, contact_name, phone, email) VALUES ?', [contactValues]);
      }

      await db.commit();
      res.status(200).json({ success: true, message: 'Client updated successfully' });

    } catch (error) {
      await db.rollback();
      console.error('Error during client update:', error.message);
      res.status(500).json({ error: 'Failed to update client' });
    }
  });

  return router;
};