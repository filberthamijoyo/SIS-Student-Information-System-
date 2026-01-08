/**
 * Formats location codes into readable text
 * 
 * Location formats:
 * - TA-101, TB-204, TC-210, TD-101 → Teaching Building A/B/C/D
 * - TCA-104, TCB-107, TCC-113, TCD-302 → Teaching Complex A/B/C/D
 * - AE-101 → Administration Building E
 * - ZX-101 → Zhixin Building
 * - PE-GYM1, PE-GYM2, etc. → Physical Education Gym
 * - DY-101 → Dao Yuan Building
 */
export const formatLocation = (location: string | null | undefined): string => {
  if (!location) return '';
  
  const loc = location.trim().toUpperCase();
  
  // Teaching Building A, B, C, D: Format "TA-101" = Teaching Building A
  // Pattern: T[A-D]-[room number]
  const teachingBuildingMatch = loc.match(/^T([A-D])-(.+)$/);
  if (teachingBuildingMatch) {
    const [, building] = teachingBuildingMatch;
    return `Teaching Building ${building}`;
  }
  
  // Teaching Complex A, B, C, D: Format "TCA-104" = Teaching Complex A
  // Pattern: TC[A-D]-[room number]
  const teachingComplexMatch = loc.match(/^TC([A-D])-(.+)$/);
  if (teachingComplexMatch) {
    const [, building] = teachingComplexMatch;
    return `Teaching Complex ${building}`;
  }
  
  // Administration Building E: Format "AE-101" = Administration Building E
  // Pattern: AE-[room number]
  const adminBuildingMatch = loc.match(/^AE-(.+)$/);
  if (adminBuildingMatch) {
    return `Administration Building E`;
  }
  
  // Zhixin Building: Format "ZX-101" = Zhixin Building
  // Pattern: ZX-[room number]
  const zhixinMatch = loc.match(/^ZX-(.+)$/);
  if (zhixinMatch) {
    return `Zhixin Building`;
  }
  
  // Physical Education Gyms: Format "PE-GYM1" = Physical Education Gym
  // Pattern: PE-GYM[number]
  const peGymMatch = loc.match(/^PE-GYM(\d+)$/);
  if (peGymMatch) {
    return `Physical Education Gym`;
  }
  
  // Dao Yuan Building: Format "DY-101" = Dao Yuan Building
  // Pattern: DY-[room number]
  const daoYuanMatch = loc.match(/^DY-(.+)$/);
  if (daoYuanMatch) {
    return `Dao Yuan Building`;
  }
  
  // If no pattern matches, return the original location
  return location;
};

