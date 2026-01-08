import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';
import { AppError } from '../utils/errors';

/**
 * Get personal information for the authenticated user
 */
export async function getPersonalInfo(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;

    let personalInfo = await prisma.personal_info.findUnique({
      where: { user_id: userId },
    });

    // Create personal info if it doesn't exist
    if (!personalInfo) {
      personalInfo = await prisma.personal_info.create({
        data: { 
          user_id: userId,
          updated_at: new Date(),
        },
      });
    }

    res.json({
      success: true,
      data: personalInfo,
    });
  } catch (error) {
    console.error('Get personal info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch personal information',
    });
  }
}

/**
 * Update personal information
 */
export async function updatePersonalInfo(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.userId;
    delete updateData.user_id;

    // Convert camelCase to snake_case for database fields
    const dbUpdateData: any = {};
    if (updateData.phoneNumber !== undefined) dbUpdateData.phone_number = updateData.phoneNumber;
    if (updateData.alternatePhone !== undefined) dbUpdateData.alternate_phone = updateData.alternatePhone;
    if (updateData.permanentAddress !== undefined) dbUpdateData.permanent_address = updateData.permanentAddress;
    if (updateData.mailingAddress !== undefined) dbUpdateData.mailing_address = updateData.mailingAddress;
    if (updateData.city !== undefined) dbUpdateData.city = updateData.city;
    if (updateData.state !== undefined) dbUpdateData.state = updateData.state;
    if (updateData.postalCode !== undefined) dbUpdateData.postal_code = updateData.postalCode;
    if (updateData.country !== undefined) dbUpdateData.country = updateData.country;
    if (updateData.dateOfBirth !== undefined) dbUpdateData.date_of_birth = updateData.dateOfBirth;
    if (updateData.gender !== undefined) dbUpdateData.gender = updateData.gender;
    if (updateData.nationality !== undefined) dbUpdateData.nationality = updateData.nationality;
    if (updateData.idNumber !== undefined) dbUpdateData.id_number = updateData.idNumber;
    if (updateData.highSchool !== undefined) dbUpdateData.high_school = updateData.highSchool;
    if (updateData.highSchoolGrad !== undefined) dbUpdateData.high_school_grad = updateData.highSchoolGrad;

    const personalInfo = await prisma.personal_info.upsert({
      where: { user_id: userId },
      update: {
        ...dbUpdateData,
        updated_at: new Date(),
      },
      create: {
        user_id: userId,
        ...dbUpdateData,
        updated_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Personal information updated successfully',
      data: personalInfo,
    });
  } catch (error) {
    console.error('Update personal info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update personal information',
    });
  }
}

/**
 * Update emergency contact information
 */
export async function updateEmergencyContact(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { emergencyName, emergencyRelation, emergencyPhone, emergencyEmail } = req.body;

    const personalInfo = await prisma.personal_info.upsert({
      where: { user_id: userId },
      update: {
        emergency_name: emergencyName,
        emergency_relation: emergencyRelation,
        emergency_phone: emergencyPhone,
        emergency_email: emergencyEmail,
        updated_at: new Date(),
      },
      create: {
        user_id: userId,
        emergency_name: emergencyName,
        emergency_relation: emergencyRelation,
        emergency_phone: emergencyPhone,
        emergency_email: emergencyEmail,
        updated_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Emergency contact updated successfully',
      data: {
        emergencyName: personalInfo.emergency_name,
        emergencyRelation: personalInfo.emergency_relation,
        emergencyPhone: personalInfo.emergency_phone,
        emergencyEmail: personalInfo.emergency_email,
      },
    });
  } catch (error) {
    console.error('Update emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update emergency contact',
    });
  }
}

/**
 * Update address information
 */
export async function updateAddress(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { permanentAddress, mailingAddress, city, state, postalCode, country } = req.body;

    const personalInfo = await prisma.personal_info.upsert({
      where: { user_id: userId },
      update: {
        permanent_address: permanentAddress,
        mailing_address: mailingAddress,
        city,
        state,
        postal_code: postalCode,
        country,
        updated_at: new Date(),
      },
      create: {
        user_id: userId,
        permanent_address: permanentAddress,
        mailing_address: mailingAddress,
        city,
        state,
        postal_code: postalCode,
        country,
        updated_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: {
        permanentAddress: personalInfo.permanent_address,
        mailingAddress: personalInfo.mailing_address,
        city: personalInfo.city,
        state: personalInfo.state,
        postalCode: personalInfo.postal_code,
        country: personalInfo.country,
      },
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update address',
    });
  }
}
