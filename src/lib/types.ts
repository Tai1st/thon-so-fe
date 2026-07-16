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
  heroImage?: string;
  siteName?: string;
  logoUrl?: string;
  oldVillages?: string[];
  slug?: string;
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

// Fallback khi tenant chưa có HomeContent.oldVillages (tenant mới, Admin
// chưa vào "Quản lý Trang chủ" định nghĩa thôn cũ) — chỉ dùng làm giá trị
// mặc định ban đầu, không phải nguồn dữ liệu chính thức nữa.
export const RESIDENT_GROUPS = ['Đoàn Kết cũ', 'Yên Khánh cũ', 'Tạm Trú', 'Lưu Trú', 'Xâm Canh'] as const;
export const FIXED_RESIDENT_GROUPS = ['Tạm Trú', 'Lưu Trú', 'Xâm Canh'] as const;

// Danh sách nhóm cư trú thật sự dùng cho dropdown chọn Resident.group —
// ghép "thôn cũ" do Admin tự định nghĩa (HomeContent.oldVillages) với các
// nhóm cố định (Tạm Trú/Lưu Trú/Xâm Canh).
export function buildResidentGroups(oldVillages: string[] | undefined): string[] {
  return [...(oldVillages && oldVillages.length > 0 ? oldVillages : []), ...FIXED_RESIDENT_GROUPS];
}

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
  households: { lat: number; lng: number; name: string }[];
}

export interface PublicCommune {
  _id: string;
  name: string;
  villages: PublicCommuneVillage[];
}

export interface AdministrativeUnitItem {
  name: string;
  logoUrl: string | null;
  lat: number;
  lng: number;
  mapsUrl: string | null;
}

export interface VillageFund {
  thu: { household: string; amount: number }[];
  chi: { desc: string; amount: number }[];
  unpaidHouseholds: number;
  totalHouseholds: number;
  bankInfo: { bankName: string; accountNumber: string; accountHolder: string };
}

export interface IncidentReportItem {
  _id: string;
  familyId: string;
  reporterName: string;
  content: string;
  locationText: string;
  lat: number | null;
  lng: number | null;
  status: 'Mới' | 'Đã tiếp nhận' | 'Đã xử lý';
  time: string;
}

export interface DeleteRequestItem {
  _id: string;
  residentId: string;
  residentName: string;
  reason: string;
  submittedBy: string;
  status: RequestStatus;
  time: string;
}

export interface AdminPendingRequests {
  deleteRequests: DeleteRequestItem[];
  memberEditRequests: MemberEditRequestItem[];
  newMemberRequests: NewMemberRequestItem[];
}

export interface AdminAccountItem {
  _id: string;
  residentId?: string;
  familyId?: string;
  username: string;
  name: string;
  role: string;
  position: string;
  lastActive: string;
  status: 'active' | 'locked';
  assoc?: string;
}

export interface AdminResidentInfo {
  _id: string;
  name: string;
  dob: string;
  gender: string;
  cccd: string;
  phone: string;
  relation: string;
  isHouseholder: boolean;
  familyId: string;
  permanentAddress: string;
  temporaryAddress: string;
  group: string;
  fatherName: string;
  motherName: string;
}

export interface AdminAccountsResponse {
  accounts: AdminAccountItem[];
  residentCount: number;
  unaccountedCount: number;
}

export interface AdminAssociationItem {
  name: string;
  balance: number;
  memberCount: number;
  leaderName: string | null;
}

export type PermissionLevel = 'view' | 'view-edit' | 'locked';
export interface RoleFieldAccess {
  cccd: PermissionLevel;
  dob: PermissionLevel;
  villageFund: PermissionLevel;
  gpsAddress: PermissionLevel;
}
export interface PermissionMatrix {
  resident: RoleFieldAccess;
  'association-officer': RoleFieldAccess;
  'village-head': RoleFieldAccess;
  'security-team': RoleFieldAccess;
  admin: RoleFieldAccess;
}

export interface AuditLogItem {
  _id: string;
  time: string;
  action: string;
  detail: string;
  actor: string;
}

export interface VillageHeadResident {
  _id: string;
  name: string;
  dob: string;
  gender: string;
  cccd: string;
  phone: string;
  relation: string;
  isHouseholder: boolean;
  familyId: string;
  group: string;
  fatherName: string;
  motherName: string;
  permanentAddress: string;
  temporaryAddress: string;
  hasPendingDeleteRequest: boolean;
}

export interface HouseholdLocation {
  familyId: string;
  headName: string;
  houseNumber: string;
  gpsCoord: GpsCoord | null;
}

export interface FundObligationDef {
  id: string;
  name: string;
  amount: number;
  period: string;
}

export interface PendingFundPayment {
  familyId: string;
  headName: string;
  obligationId: string;
  name: string;
  amount: number;
  date: string;
}

export interface UnpaidHousehold {
  familyId: string;
  representative: string;
  dob: string;
  group: string;
  unpaidAmount: number;
}

export interface VillageFundOverview {
  thuTotal: number;
  chiTotal: number;
  balance: number;
  thu: { id?: string; household: string; amount: number; date?: string }[];
  chi: { id?: string; desc: string; amount: number; date?: string }[];
  bankInfo: { bankName: string; accountNumber: string; accountHolder: string };
  obligations: FundObligationDef[];
  pendingPayments: PendingFundPayment[];
  unpaidHouseholds: UnpaidHousehold[];
}

export interface ResidenceRegistrationItem {
  _id: string;
  familyId: string;
  hostName: string;
  guestName: string;
  guestCccd: string;
  relationship: string;
  reason: string;
  fromDate: string;
  toDate: string;
  status: 'Chờ duyệt' | 'Đã duyệt' | 'Từ chối';
  submittedBy: string;
  time: string;
}

export interface IncidentReportWithHead extends IncidentReportItem {
  headName: string;
}

export interface IncidentMinutesItem {
  _id: string;
  relatedReportId: string | null;
  title: string;
  location: string;
  involvedPeople: string;
  content: string;
  createdBy: string;
  time: string;
}

export interface SecurityTeamResident {
  _id: string;
  name: string;
  dob: string;
  cccd: string;
  phone: string;
  relation: string;
  isHouseholder: boolean;
  familyId: string;
  group: string;
}

export interface SecurityRosterMember {
  name: string;
  title: string;
  phone: string;
  phoneDisplay: string;
  cccd: string;
  dob: string;
  familyId: string;
  group: string;
}

export interface AssociationMember {
  _id: string;
  name: string;
  dob: string;
  group: string;
  phone: string;
  familyId: string;
}

export interface AssociationMembersResponse {
  association: string;
  members: AssociationMember[];
  nonMembers: AssociationMember[];
}

export interface AssocTransaction {
  id: string;
  type: 'Thu' | 'Chi';
  desc: string;
  member?: string;
  amount: number;
  date: string;
  officer?: string;
}

export interface AssocLoan {
  id: string;
  memberName: string;
  amount: number;
  interestRate: number;
  termMonths: number;
  status: string;
  date: string;
  completedDate: string | null;
  disburseTxId?: string;
  completeTxId?: string;
}

export interface AssocPendingPayment {
  residentId: string;
  memberName: string;
  obligationId: string;
  name: string;
  amount: number;
  date: string;
}

export interface AssocFundOverview {
  association: string;
  balance: number;
  txs: AssocTransaction[];
  loans: AssocLoan[];
  bankInfo: { bankName: string; accountNumber: string; accountHolder: string };
  feeObligations: FundObligationDef[];
  pendingPayments: AssocPendingPayment[];
  members: AssociationMember[];
}
