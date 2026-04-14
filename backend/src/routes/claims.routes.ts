import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth';
import * as claimsController from '../controllers/claims.controller';

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  },
});

const router = Router();

router.use(authenticate);

router.get('/', claimsController.getMyClaims);
router.post('/', claimsController.createClaim);
router.get('/:claimId', claimsController.getClaim);
router.put('/:claimId', claimsController.updateClaim);
router.delete('/:claimId', claimsController.deleteClaim);

router.post('/:claimId/submit', claimsController.submitClaim);
router.post('/:claimId/withdraw', claimsController.withdrawClaim);

router.post('/:claimId/items', claimsController.addItem);
router.put('/items/:itemId', claimsController.updateItem);
router.delete('/items/:itemId', claimsController.deleteItem);

router.post('/items/:itemId/receipts', upload.single('receipt'), claimsController.uploadReceipt);
router.delete('/receipts/:receiptId', claimsController.deleteReceipt);

export default router;