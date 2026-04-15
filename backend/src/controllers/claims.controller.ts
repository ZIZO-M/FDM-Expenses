import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as claimsService from '../services/claims.service';

// view claims
export async function getMyClaims(req: AuthRequest, res: Response): Promise<void> {
  try {
    const claims = await claimsService.getEmployeeClaims(req.user!.employeeId);
    res.status(200).json(claims);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching claims';
    res.status(500).json({ error: message });
  }
}

// create claim
export async function createClaim(req: AuthRequest, res: Response): Promise<void> {
  try {
    const claim = await claimsService.createClaim(req.user!.employeeId, req.body);
    res.status(201).json(claim);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error creating claim';
    res.status(400).json({ error: message });
  }
}

// view single claim
export async function getClaim(req: AuthRequest, res: Response): Promise<void> {
  try {
    const claim = await claimsService.getClaimById(
      req.params.claimId,
      req.user!.employeeId
    );
    res.status(200).json(claim);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Claim not found';
    res.status(404).json({ error: message });
  }
}

// update claim
export async function updateClaim(req: AuthRequest, res: Response): Promise<void> {
  try {
    const claim = await claimsService.updateClaim(
      req.params.claimId,
      req.user!.employeeId,
      req.body
    );
    res.status(200).json(claim);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error updating claim';
    res.status(400).json({ error: message });
  }
}

// submit claim
export async function submitClaim(req: AuthRequest, res: Response): Promise<void> {
  try {
    await claimsService.submitClaim(req.params.claimId, req.user!.employeeId);
    res.status(200).json({ message: 'Claim submitted successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error submitting claim';
    res.status(400).json({ error: message });
  }
}

// withdraw claim
export async function withdrawClaim(req: AuthRequest, res: Response): Promise<void> {
  try {
    await claimsService.withdrawClaim(req.params.claimId, req.user!.employeeId);
    res.status(200).json({ message: 'Claim withdrawn successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error withdrawing claim';
    res.status(400).json({ error: message });
  }
}

// delete claim
export async function deleteClaim(req: AuthRequest, res: Response): Promise<void> {
  try {
    await claimsService.deleteClaim(req.params.claimId, req.user!.employeeId);

    res.status(200).json({
      message: 'Claim deleted successfully',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error deleting claim';

    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(400).json({ error: message });
    }
  }
}

// add item
export async function addItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const item = await claimsService.addItem(
      req.params.claimId,
      req.user!.employeeId,
      req.body
    );
    res.status(201).json(item);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error adding item';
    res.status(400).json({ error: message });
  }
}

// update item
export async function updateItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const item = await claimsService.updateItem(
      req.params.itemId,
      req.user!.employeeId,
      req.body
    );
    res.status(200).json(item);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error updating item';
    res.status(400).json({ error: message });
  }
}

// delete item
export async function deleteItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    await claimsService.deleteItem(req.params.itemId, req.user!.employeeId);
    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error deleting item';
    res.status(400).json({ error: message });
  }
}

// upload receipt
export async function uploadReceipt(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const receipt = await claimsService.createReceipt(
      req.params.itemId,
      req.user!.employeeId,
      req.file,
      req.body.vatNumber || undefined,
      req.body.totalOnReceipt ? parseFloat(req.body.totalOnReceipt) : undefined
    );
    res.status(201).json(receipt);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error uploading receipt';
    res.status(400).json({ error: message });
  }
}

// delete receipt
export async function deleteReceipt(req: AuthRequest, res: Response): Promise<void> {
  try {
    await claimsService.deleteReceipt(req.params.receiptId, req.user!.employeeId);
    res.status(200).json({ message: 'Receipt deleted successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error deleting receipt';
    res.status(400).json({ error: message });
  }
}