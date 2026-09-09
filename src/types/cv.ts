// Mirrors app/src/main/java/com/medcvmaker/domain/model/*.kt from the Android
// app, so the two clients agree on shape even though nothing is shared at
// runtime (there is no backend for either client to sync through — spec
// section 3/20 applies here too: everything below lives only in the
// browser's localStorage, never on a server).

export type Profession =
  | "DOCTOR"
  | "NURSE"
  | "NURSING_STUDENT"
  | "MEDICAL_STUDENT"
  | "PHARMACIST"
  | "PHYSIOTHERAPIST"
  | "MEDICAL_LAB_TECHNICIAN"
  | "RADIOLOGY_TECHNICIAN"
  | "HEALTHCARE_ASSISTANT"
  | "OTHER";

export const PROFESSION_LABELS: Record<Profession, string> = {
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  NURSING_STUDENT: "Nursing Student",
  MEDICAL_STUDENT: "Medical Student",
  PHARMACIST: "Pharmacist",
  PHYSIOTHERAPIST: "Physiotherapist",
  MEDICAL_LAB_TECHNICIAN: "Medical Laboratory Technician",
  RADIOLOGY_TECHNICIAN: "Radiology Technician",
  HEALTHCARE_ASSISTANT: "Healthcare Assistant",
  OTHER: "Other",
};

export interface PersonalInfo {
  fullName: string;
  professionalTitle: string;
  phone: string;
  email: string;
  cityCountry: string;
  professionalSummary: string;
  /** A local object URL or data URL only — never uploaded anywhere. */
  profilePhotoDataUrl: string | null;
  photoShape?: "round" | "square";
  linkedInUrl: string;
  professionalWebsite: string;
  dateOfBirth: string;
  maritalStatus: string;
  nationality: string;
  fullAddress: string;
  caste: string;
  religion: string;
}

export interface RegistrationInfo {
  registrationNumber: string;
  councilOrBoard: string;
  registrationRegion: string;
  licenseExpiry: string;
  yearsOfExperience: string;
  currentPosition: string;
  specialization: string;
}

export interface EducationEntry {
  id: string;
  degree: string;
  institution: string;
  location: string;
  startYear: string;
  graduationYear: string;
  grade: string;
}

export interface ExperienceEntry {
  id: string;
  hospital: string;
  department: string;
  position: string;
  specialty: string;
  startDate: string;
  endDate: string;
  responsibilities: string;
  clinicalSkills: string[];
  achievements: string;
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuingBody: string;
  issueDate: string;
  expiryDate: string;
}

export interface LanguageEntry {
  id: string;
  language: string;
  proficiency: string;
}

export interface CustomSectionEntry {
  id: string;
  heading: string;
  description: string;
  date: string;
  location: string;
}

export interface CustomSection {
  id: string;
  title: string;
  entries: CustomSectionEntry[];
}

export interface CvDocument {
  id: string;
  label: string;
  profession: Profession;
  templateId: string;
  colorId: string;
  personalInfo: PersonalInfo;
  registrationInfo: RegistrationInfo;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  certifications: CertificationEntry[];
  languages: LanguageEntry[];
  achievements: string;
  publications: string;
  conferences: string;
  memberships: string;
  references: string;
  internship: string;
  hobbies: string;
  skills: string;
  declaration: string;
  declarationDate: string;
  declarationPlace: string;
  signatureName: string;
  signatureDataUrl: string | null;
  customSections: CustomSection[];
  /** Controls PDF section order — see SECTION_LABELS below. */
  sectionOrder: string[];
  createdAt: number;
  updatedAt: number;
  isDraft: boolean;
}

export const SECTION_LABELS: Record<string, string> = {
  summary: "Professional Summary",
  registration: "Registration & License",
  experience: "Clinical Experience",
  education: "Education",
  certifications: "Certifications",
  achievements: "Achievements",
  languages: "Languages",
  publications: "Publications",
  conferences: "Conferences / Workshops",
  memberships: "Professional Memberships",
  custom: "Custom Sections",
  references: "References",
  internship: "Internship / Clinical Training",
  hobbies: "Interests",
  skills: "Core Skills",
  declaration: "Declaration",
};

export function defaultSectionOrder(): string[] {
  return [
    "summary",
    "skills",
    "registration",
    "experience",
    "education",
    "internship",
    "certifications",
    "achievements",
    "languages",
    "publications",
    "conferences",
    "memberships",
    "custom",
    "references",
    "hobbies",
    "declaration",
  ];
}

export function emptyPersonalInfo(): PersonalInfo {
  return {
    fullName: "",
    professionalTitle: "",
    phone: "",
    email: "",
    cityCountry: "",
    professionalSummary: "",
    profilePhotoDataUrl: null,
    linkedInUrl: "",
    professionalWebsite: "",
    dateOfBirth: "",
    maritalStatus: "",
    nationality: "",
    fullAddress: "",
    caste: "",
    religion: "",
  };
}

export function emptyRegistrationInfo(): RegistrationInfo {
  return {
    registrationNumber: "",
    councilOrBoard: "",
    registrationRegion: "",
    licenseExpiry: "",
    yearsOfExperience: "",
    currentPosition: "",
    specialization: "",
  };
}

export function newCvDocument(id: string, profession: Profession = "OTHER"): CvDocument {
  const now = Date.now();
  return {
    id,
    label: "",
    profession,
    templateId: "ats_professional_clarity_01",
    colorId: "navy",
    personalInfo: emptyPersonalInfo(),
    registrationInfo: emptyRegistrationInfo(),
    education: [],
    experience: [],
    certifications: [],
    languages: [],
    achievements: "",
    publications: "",
    conferences: "",
    memberships: "",
    references: "",
    internship: "",
    hobbies: "",
    skills: "",
    declaration: "I hereby declare that the information provided above is true and correct to the best of my knowledge and belief.",
    declarationDate: "",
    declarationPlace: "",
    signatureName: "",
    signatureDataUrl: null,
    customSections: [],
    sectionOrder: defaultSectionOrder(),
    createdAt: now,
    updatedAt: now,
    isDraft: true,
  };
}
