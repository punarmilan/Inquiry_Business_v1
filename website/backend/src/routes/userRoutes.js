const express = require('express');
const userController = require('../controllers/userController');
const validate = require('../middleware/validate');
const { requireAdminAuth } = require('../middleware/auth');
const { listUsersSchema, userIdSchema, userRejectSchema } = require('../validators/user.validator');

const router = express.Router();

router.use(requireAdminAuth);

router.get('/', validate(listUsersSchema), userController.listUsers);
router.get('/:id', validate(userIdSchema), userController.getUserDetail);
router.put('/:id/block', validate(userIdSchema), userController.blockUser);
router.put('/:id/unblock', validate(userIdSchema), userController.unblockUser);
router.delete('/:id', validate(userIdSchema), userController.deleteUser);
router.put('/:id/verify', validate(userIdSchema), userController.verifyUser);
router.put('/:id/kyc/approve', validate(userIdSchema), userController.approveKyc);
router.put('/:id/kyc/reject', validate(userRejectSchema), userController.rejectKyc);
router.put('/:id/wallet/approve', validate(userIdSchema), userController.approveWallet);
router.put('/:id/wallet/reject', validate(userRejectSchema), userController.rejectWallet);
router.put('/:id/account-type/approve', validate(userIdSchema), userController.approveAccountTypeChange);
router.put('/:id/account-type/reject', validate(userRejectSchema), userController.rejectAccountTypeChange);

module.exports = router;
