export interface Stat {
  id: string;
  icon: string;
  label: string;
  value: string;
  unit: string;
  breakdown: { label: string; value: string }[];
}

export interface NewsItem {
  id: string;
  categorySlug: string;
  category: string;
  colorClass: string;
  date: string;
  title: string;
  summary: string;
  content: string;
  createdBy: string;
}

export interface Product {
  id: string;
  name: string;
  badge: string;
  image: string;
  desc: string;
  footerLabel: string;
  footerValue: string;
}

export interface ScheduleItem {
  id: string;
  day: string;
  month: string;
  title: string;
  location: string;
  time: string;
}

export interface GalleryItem {
  id: string;
  image: string;
  caption: string;
}

export interface HomeContent {
  stats: Stat[];
  news: NewsItem[];
  products: Product[];
  security: { hotline: string; hotlineDisplay: string; slogan: string };
  schedule: ScheduleItem[];
  gallery: GalleryItem[];
}

export interface RosterMember {
  role?: string;
  title?: string;
  name: string;
  phone: string;
  phoneDisplay: string;
}

export interface PublicRoster {
  leadership: RosterMember[];
  security: RosterMember[];
}

export interface HouseholdMember {
  _id: string;
  name: string;
  dob: string;
  gender: string;
  cccd: string;
  phone: string;
  relation: string;
  isHouseholder: boolean;
  familyId: string;
  fatherName: string;
  motherName: string;
  group: string;
  permanentAddress: string;
  temporaryAddress: string;
}

export const RESIDENT_GROUPS = ['Đoàn Kết cũ', 'Yên Khánh cũ', 'Tạm Trú', 'Lưu Trú', 'Xâm Canh'] as const;

export interface FundObligation {
  id: string;
  name: string;
  memo: string;
  period: string;
  amount: number;
  status: 'Đã đóng' | 'Chưa đóng' | 'Chờ duyệt';
  date: string;
}

export interface GpsCoord {
  lat: number;
  lng: number;
}

export interface HouseholdData {
  familyId: string;
  members: HouseholdMember[];
  gpsCoord: GpsCoord | null;
  houseNumber: string;
  fundObligations: FundObligation[];
}

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface MemberEditRequestItem {
  _id: string;
  residentId: string;
  residentName: string;
  submittedBy: string;
  status: RequestStatus;
  time: string;
  oldValues: Record<string, string>;
  newValues: Record<string, string>;
}

export interface NewMemberRequestItem {
  _id: string;
  familyId: string;
  name: string;
  relation: string;
  dob: string;
  cccd: string;
  phone: string;
  fatherName?: string;
  motherName?: string;
  group?: string;
  permanentAddress?: string;
  temporaryAddress?: string;
  submittedBy: string;
  status: RequestStatus;
  time: string;
}

export interface RequestsMine {
  memberEditRequests: MemberEditRequestItem[];
  newMemberRequests: NewMemberRequestItem[];
}

export interface PublicTenant {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  boundary: { type: 'Polygon'; coordinates: number[][][] };
}

export interface CommuneListItem {
  _id: string;
  name: string;
  createdAt: string;
  totalVillages: number;
  claimedVillages: number;
}

export interface CommuneVillage {
  name: string;
  slugSuggestion: string;
  lat: number;
  lng: number;
  boundary: { type: string; coordinates: number[][][] };
  claimed: boolean;
  tenantId?: string;
}

export interface CommuneDetail {
  _id: string;
  name: string;
  createdAt: string;
  villages: CommuneVillage[];
}

export interface PublicCommuneVillage {
  name: string;
  lat: number;
  lng: number;
  boundary: { type: string; coordinates: number[][][] };
  tenantSlug: string | null;
  tenantName: string | null;
}

export interface PublicCommune {
  _id: string;
  name: string;
  villages: PublicCommuneVillage[];
}
