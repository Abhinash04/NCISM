const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/mfa/login', (req, res, next) => authController.mfaLogin(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));

// MFA self-enrollment (signed-in user).
router.post('/mfa/enroll', authenticate, (req, res, next) => authController.mfaEnroll(req, res, next));
router.post('/mfa/verify', authenticate, (req, res, next) => authController.mfaVerify(req, res, next));
router.post('/mfa/disable', authenticate, (req, res, next) => authController.mfaDisable(req, res, next));

module.exports = router;
