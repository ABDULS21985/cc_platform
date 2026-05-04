import axiosInstance from "@/lib/axios";

// --- Types & Interfaces (Updated from V2 OpenAPI) ---

// Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Common Schemas
export interface UserResponse {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  full_name: string;
  role: string;
  email_verified: boolean;
  profile_image: string | null;
  header_image: string | null;
}

export interface AuthVerificationStatus {
  bvn_verified: boolean;
  nin_verified: boolean;
  verification_status: string | null;
}

export interface TokensResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// Auth Types
export interface AuthSuccess {
  success: boolean;
  message: string;
  user: UserResponse | null;
  verification: AuthVerificationStatus | null;
  tokens: TokensResponse | null;
  user_id: number | null;
  requires_otp?: boolean | null;
  otp_sent?: boolean | null;
}

export interface SignupPayload {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  date_of_birth: string;
  phone_number?: string | null;
  nin?: string | null;
  role?: "user" | "admin";
}

export interface LoginPayload {
  email: string;
  password?: string;
  remember?: boolean;
}

export interface VerifyOTPPyload {
  email: string;
  otp: string;
  remember?: boolean;
}

export interface ResendOTPPayload {
  email: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  new_password: string;
}

// Verification Types
export interface BvnVerificationPayload {
  bvn: string;
  date_of_birth: string;
}

export interface VerificationData {
  verification_id: number;
  task_id: string;
  status: string;
  estimated_time?: string;
}

export interface VerificationResponse {
  success: boolean;
  message: string;
  data: VerificationData;
}

export interface NinVerificationPayload {
  nin: string;
  date_of_birth: string;
}

export interface VerificationStatusData {
  id: number;
  user_id: number;
  verification_type: string;
  status: string;
  verified: boolean;
  verified_at: string | null;
  error_message: string | null;
}

export interface VerificationStatus {
  success: boolean;
  message: string;
  data: VerificationStatusData;
}

export interface TaskVerification {
  id: number;
  status: string;
  verification_type: string;
  verified_at: string | null;
  error_message: string | null;
}

export interface TaskStatusData {
  task_id: string;
  state: string;
  status: string;
  message: string;
  progress: number;
  result: any | null;
  error: string | null;
  retry_count: number | null;
  verification: TaskVerification | null;
}

export interface TaskStatusResponse {
  success: boolean;
  data: TaskStatusData;
}

// Wallet Types
export interface WalletData {
  id: number;
  account_number: string;
  account_name: string;
  balance: string;
  currency: string;
  status: string;
  created_at: string;
}

export interface WalletResponse {
  success: boolean;
  message: string;
  data: WalletData;
}

export interface TransactionData {
  id: number;
  reference: string;
  type: string;
  amount: string;
  fee: string;
  net_amount: string;
  description: string;
  source_account_name: string | null;
  source_bank_name: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface TransactionList {
  transactions: TransactionData[];
  pagination: Pagination;
}

export interface TransactionResponse {
  success: boolean;
  message: string;
  data: TransactionList;
}

export interface SummaryStats {
  total_credits: string;
  total_debits: string;
  transaction_count: number;
}

export interface WalletSummaryData {
  wallet: WalletData | null;
  recent_transactions: TransactionData[];
  summary: SummaryStats;
}

export interface WalletSummaryResponse {
  success: boolean;
  message: string;
  data: WalletSummaryData;
}

export interface DepositPayload {
  amount: number;
  description?: string;
}

export interface BankDetails {
  account_number: string;
  account_name: string;
  bank_name: string;
}

export interface DepositData {
  transaction_id: number;
  reference: string;
  amount: string;
  status: string;
  bank_details: BankDetails;
  instructions: string;
  message: string;
}

export interface DepositResponse {
  success: boolean;
  data: DepositData;
}

export interface WithdrawPayload {
  amount: number;
  bank_code: string;
  account_number: string;
  account_name?: string;
}

export interface WithdrawData {
  transaction_id: number;
  reference: string;
  amount: string;
  fee: string;
  net_amount: string;
  status: string;
  destination_bank: string;
  destination_account: string;
  message: string;
}

export interface WithdrawResponse {
  success: boolean;
  data: WithdrawData;
}

// Profile Types
export interface ProfileData extends UserResponse {
  firebase_uid: string;
  date_of_birth: string;
  phone_number: string;
  bio: string;
  profile_photo: string;
  nin: string;
  email_verified: boolean;
  bvn_verified: boolean;
  nin_verified: boolean;
  verification_status: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdatePayload {
  firstname?: string | null;
  lastname?: string | null;
  phone_number?: string | null;
  date_of_birth?: string | null;
  bio?: string | null;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// Community Types
export interface CommunityData {
  created_at: string;
  created_by: number;
  description: string;
  id: number;
  institution_id: number;
  is_joined: boolean;
  member_cost: string;
  member_count: number;
  name: string;
  organization_id: number;
  slug: string;
  status: string;
  visibility: string;
}

export interface CommunityListData {
  communities: CommunityData[];
  pagination: any;
}

export interface CommunityListResponse {
  success: boolean;
  message: string;
  data: CommunityListData;
}

export interface CreateCommunityPayload {
  name: string;
  description?: string | null;
  visibility?: "public" | "private";
  member_cost?: number;
  interest_ids?: number[];
  institution_id?: number;
  organization_id?: number;
}

export interface CommunityResponse {
  success: boolean;
  message: string;
  data: CommunityData;
}

export interface MemberData {
  id: number;
  user_id: number;
  community_id: number;
  role: string;
  status: string;
  joined_at: string;
  user: any;
}

export interface MemberListData {
  members: MemberData[];
  pagination: any;
}

export interface MemberListResponse {
  success: boolean;
  message: string;
  data: MemberListData;
}

export interface MemberResponse {
  success: boolean;
  message: string;
  data: MemberData;
}

// Bill Types
export interface BillData {
  amount: number;
  collected_amount: number;
  community_id: number;
  created_at: string;
  creator_id: number;
  description?: string;
  due_date: string;
  id: number;
  is_recurring: boolean;
  min_amount: string;
  recurrence_type?: string;
  status: string;
  title: string;
  type: string;
  updated_at: string;
}

export interface BillListData {
  bills: BillData[];
  pagination: any;
}

export interface BillListResponse {
  message: string;
  success: boolean;
  data: BillListData;
}

export interface CreateBillPayload {
  title: string;
  description?: string | null;
  amount: number;
  type?: string;
  min_amount?: number;
  is_recurring?: boolean;
  recurrence_type?: string | null;
  due_date: string;
}

export interface BillResponse {
  success: boolean;
  message: string;
  data: BillData;
}

// Post Types
export interface PostAuthor {
  id: number;
  firstname: string;
  lastname: string;
  full_name: string;
  profile_photo: string;
}

export interface PostMention {
  id: number;
  post_id: number;
  mentioned_user_id: number;
  created_at: string;
  user: PostAuthor;
}

export interface PostData {
  id: number;
  community_id: number;
  author_user_id: number;
  body: string;
  media_urls: string[];
  post_type: string;
  status: string;
  is_pinned: boolean;
  comments_enabled: boolean;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  mention_count: number;
  mentioned_user_ids: number[];
  author: PostAuthor;
  mentions: PostMention[];
}

export interface PostListData {
  posts: PostData[];
  pagination: Pagination;
}

export interface PostListResponse {
  success: boolean;
  message: string;
  data: PostListData;
}

export interface PayBillPayload {
  amount: number;
  payment_method: "wallet" | "transfer" | "card";
  transaction_reference?: string | null;
}

export interface PaymentData {
  transaction_id: number;
  reference: string;
  amount: string;
  status: string;
  account_details: any;
  instructions: string;
  expires_in: string;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  data: PaymentData;
}

export interface OrganizationData {
  id: number;
  institution_id: number;
  name: string;
  slug: string;
  description: string;
  is_default: boolean;
  status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationListData {
  organizations: OrganizationData[];
  pagination: any;
}

export interface OrganizationListResponse {
  success: boolean;
  message: string;
  data: OrganizationListData;
}

export interface CreateOrganizationPayload {
  institution_id?: number;
  name: string;
  description?: string;
  is_default?: boolean;
}

export interface OrganizationResponse {
  success: boolean;
  message: string;
  data: OrganizationData;
}

// --- API Service Object ---

export const ApiService = {
  // =========================================================================
  // Auth V2
  // =========================================================================
  auth: {
    health: () => axiosInstance.get("/v2/auth/health"),

    signup: (data: SignupPayload) =>
      axiosInstance.post<AuthSuccess>("/v2/auth/signup", data),

    login: (data: LoginPayload) =>
      axiosInstance.post<ApiResponse<AuthSuccess>>("/v2/auth/login", data),

    verifyEmail: (data: VerifyOTPPyload) =>
      axiosInstance.post<AuthSuccess>("/v2/auth/verify-email", data),

    verifyLoginOtp: (data: VerifyOTPPyload) =>
      axiosInstance.post<AuthSuccess>("/v2/auth/verify-login-otp", data),

    resendOtp: (email: string) =>
      axiosInstance.post<AuthSuccess>("/v2/auth/resend-otp", { email }),

    forgotPassword: (data: ForgotPasswordPayload) =>
      axiosInstance.post<AuthSuccess>("/v2/auth/forgot-password", data),

    resetPassword: (data: ResetPasswordPayload) =>
      axiosInstance.post<AuthSuccess>("/v2/auth/reset-password", data),

    logout: () => axiosInstance.post<AuthSuccess>("/v2/auth/logout"),
  },

  // =========================================================================
  // Verification
  // =========================================================================
  verification: {
    verifyBvn: (data: BvnVerificationPayload) =>
      axiosInstance.post<VerificationResponse>("/v2/verification/bvn", data),

    verifyNin: (data: NinVerificationPayload) =>
      axiosInstance.post<VerificationResponse>("/v2/verification/nin", data),

    getStatus: () =>
      axiosInstance.get<VerificationStatus>("/v2/verification/status"),

    getTaskStatus: (taskId: string) =>
      axiosInstance.get<TaskStatusResponse>(`/v2/verification/task/${taskId}`),
  },

  // =========================================================================
  // Wallet
  // =========================================================================
  wallet: {
    getDetails: () => axiosInstance.get<WalletResponse>("/v2/wallet"),

    getSummary: () =>
      axiosInstance.get<WalletSummaryResponse>("/v2/wallet/summary"),

    deposit: (data: DepositPayload) =>
      axiosInstance.post<DepositResponse>("/v2/wallet/deposit", data),

    withdraw: (data: WithdrawPayload) =>
      axiosInstance.post<WithdrawResponse>("/v2/wallet/withdraw", data),

    getTransactions: (params?: {
      limit?: number;
      offset?: number;
      type?: "credit" | "debit";
    }) =>
      axiosInstance.get<TransactionResponse>("/v2/wallet/transactions", {
        params,
      }),
  },

  // =========================================================================
  // Profile (V2)
  // =========================================================================
  profile: {
    get: () => axiosInstance.get<ApiResponse<ProfileData>>("/v2/user/profile"),

    update: (data: ProfileUpdatePayload) =>
      axiosInstance.patch<ApiResponse<ProfileData>>("/v2/user/profile", data),

    uploadImage: (formData: FormData) =>
      axiosInstance.post<ApiResponse<ProfileData>>(
        "/v2/user/profile/upload-image",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      ),

    uploadHeader: (formData: FormData) =>
      axiosInstance.post<ApiResponse<ProfileData>>(
        "/v2/user/profile/upload-header",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      ),

    changePassword: (data: ChangePasswordPayload) =>
      axiosInstance.post<ApiResponse<void>>("/v2/user/change-password", data),
  },

  // =========================================================================
  // Community (V2)
  // =========================================================================
  communities: {
    // Basic CRUD
    list: (params?: {
      query?: string;
      interest_id?: number;
      visibility?: string;
      limit?: number;
      offset?: number;
    }) => axiosInstance.get<CommunityListResponse>("/v2/community", { params }),

    mine: (params?: {
      query?: string;
      interest_id?: number;
      visibility?: string;
      limit?: number;
      offset?: number;
    }) =>
      axiosInstance.get<CommunityListResponse>("/v2/community/me/owned", {
        params,
      }),

    joined: (params?: {
      query?: string;
      interest_id?: number;
      visibility?: string;
      limit?: number;
      offset?: number;
    }) =>
      axiosInstance.get<CommunityListResponse>("/v2/community/me", { params }),

    create: (data: CreateCommunityPayload) =>
      axiosInstance.post<CommunityResponse>("/v2/community", data),

    get: (id: number) =>
      axiosInstance.get<CommunityResponse>(`/v2/community/${id}`),

    update: (id: number, data: Partial<CreateCommunityPayload>) =>
      axiosInstance.put<CommunityResponse>(`/v2/community/${id}`, data),

    delete: (id: number) => axiosInstance.delete(`/v2/community/${id}`),

    getStats: (id: number) =>
      axiosInstance.get<ApiResponse<any>>(`/v2/community/${id}/stats`),

    // Membership
    joinFree: (id: number) =>
      axiosInstance.post<ApiResponse<any>>(`/v2/community/${id}/join`),

    leave: (id: number) =>
      axiosInstance.post<ApiResponse<any>>(`/v2/community/${id}/leave`),

    getMembers: (id: number, params?: { limit?: number; offset?: number }) =>
      axiosInstance.get<MemberListResponse>(`/v2/community/${id}/members`, {
        params,
      }),

    getMember: (communityId: number, userId: number) =>
      axiosInstance.get<MemberResponse>(
        `/v2/community/${communityId}/members/${userId}`,
      ),

    updateMemberRole: (communityId: number, userId: number, role: string) =>
      axiosInstance.put<MemberResponse>(
        `/v2/community/${communityId}/members/${userId}/role`,
        { role },
      ),

    removeMember: (communityId: number, userId: number) =>
      axiosInstance.delete<ApiResponse<any>>(
        `/v2/community/${communityId}/members/${userId}`,
      ),

    // Invites
    createInvite: (
      id: number,
      data?: {
        expires_in_days?: number;
        max_uses?: number;
        regenerate?: boolean;
      },
    ) =>
      axiosInstance.post<ApiResponse<any>>(`/v2/community/${id}/invite`, data),

    revokeInvite: (id: number) =>
      axiosInstance.post<ApiResponse<any>>(`/v2/community/${id}/invite/revoke`),

    getInvite: (code: string) =>
      axiosInstance.get<ApiResponse<any>>(`/v2/community/invite/${code}`),

    joinViaInvite: (code: string) =>
      axiosInstance.post<ApiResponse<any>>(`/v2/community/invite/${code}/join`),

    // Payment / Wallet (Community)
    deposit: (id: number, data: { amount: number; description?: string }) =>
      axiosInstance.post<PaymentResponse>(`/v2/community/${id}/deposit`, data),

    initiateMembershipPayment: (id: number, inviteCode: string) =>
      axiosInstance.post<PaymentResponse>(
        `/v2/community/${id}/membership/payment/initiate`,
        { invite_code: inviteCode },
      ),

    verifyMembershipPayment: (id: number, reference: string) =>
      axiosInstance.post<ApiResponse<any>>(
        `/v2/community/${id}/membership/payment/verify`,
        { reference },
      ),

    getMembershipPaymentStatus: (id: number) =>
      axiosInstance.get<ApiResponse<any>>(
        `/v2/community/${id}/membership/payment/status`,
      ),

    getBalance: (id: number) =>
      axiosInstance.get<ApiResponse<any>>(`/v2/community/${id}/balance`),

    transfer: (
      id: number,
      data: {
        amount: number;
        recipient_account: string;
        recipient_name: string;
        reason?: string;
      },
    ) =>
      axiosInstance.post<ApiResponse<any>>(
        `/v2/community/${id}/transfer`,
        data,
      ),

    // Bills
    getBills: (id: number, params?: { limit?: number; offset?: number }) =>
      axiosInstance.get<BillListResponse>(`/v2/community/${id}/bills`, {
        params,
      }),

    createBill: (id: number, data: CreateBillPayload) =>
      axiosInstance.post<BillResponse>(`/v2/community/${id}/bills`, data),

    getBill: (communityId: number, billId: number) =>
      axiosInstance.get<BillResponse>(
        `/v2/community/${communityId}/bills/${billId}`,
      ),

    updateBill: (
      communityId: number,
      billId: number,
      data: Partial<CreateBillPayload>,
    ) =>
      axiosInstance.put<BillResponse>(
        `/v2/community/${communityId}/bills/${billId}`,
        data,
      ),

    deleteBill: (communityId: number, billId: number) =>
      axiosInstance.delete<ApiResponse<any>>(
        `/v2/community/${communityId}/bills/${billId}`,
      ),

    payBill: (communityId: number, billId: number, data: PayBillPayload) =>
      axiosInstance.post<PaymentResponse>(
        `/v2/community/${communityId}/bills/${billId}/pay`,
        data,
      ),

    // Posts
    getPosts: (
      communityId: number,
      params?: { limit?: number; offset?: number; pinned_only?: boolean },
    ) =>
      axiosInstance.get<PostListResponse>(`/v2/community/${communityId}/posts`, {
        params,
      }),

    createPost: (
      communityId: number,
      data: {
        body: string | null;
        media_urls?: string[];
        mentioned_user_ids?: number[];
        post_type?: string;
        is_pinned?: boolean;
        comments_enabled?: boolean;
      },
    ) =>
      axiosInstance.post<ApiResponse<PostData>>(
        `/v2/community/${communityId}/posts`,
        data,
      ),

    deletePost: (postId: number) =>
      axiosInstance.delete<ApiResponse<any>>(`/v2/community/posts/${postId}`),
  },

  organizations: {
    list: (params?: {
      institution_id?: number;
      limit?: number;
      offset?: number;
    }) =>
      axiosInstance.get<OrganizationListResponse>("/v2/organizations", {
        params,
      }),

    create: (data: CreateOrganizationPayload) =>
      axiosInstance.post<OrganizationResponse>("/v2/organizations", data),

    get: (id: number) =>
      axiosInstance.get<OrganizationResponse>(`/v2/organizations/${id}`),
  },

  // =========================================================================
  // Notifications (in-app inbox)
  // =========================================================================
  notifications: {
    list: (params?: {
      limit?: number;
      offset?: number;
      unread_only?: boolean;
      category?: string;
    }) =>
      axiosInstance.get<ApiResponse<{
        notifications: NotificationApi[];
        pagination: { total: number; limit: number; offset: number };
        unread_count: number;
      }>>("/v2/notifications/", { params }),

    unreadCount: () =>
      axiosInstance.get<ApiResponse<{ unread_count: number }>>(
        "/v2/notifications/unread-count",
      ),

    create: (data: {
      title: string;
      body?: string;
      category?: string;
      source?: string;
      action_href?: string | null;
      action_label?: string | null;
    }) =>
      axiosInstance.post<ApiResponse<NotificationApi>>(
        "/v2/notifications/",
        data,
      ),

    markRead: (id: number) =>
      axiosInstance.patch<ApiResponse<{ notification: NotificationApi }>>(
        `/v2/notifications/${id}`,
      ),

    markAllRead: () =>
      axiosInstance.post<ApiResponse<{ updated: number }>>(
        "/v2/notifications/read-all",
      ),

    delete: (id: number) =>
      axiosInstance.delete<ApiResponse<{ deleted: boolean }>>(
        `/v2/notifications/${id}`,
      ),
  },
};

export interface NotificationApi {
  id: number;
  user_id: number;
  category: string;
  title: string;
  body: string;
  source: string;
  action_href: string | null;
  action_label: string | null;
  amount: { value: string; direction: "in" | "out" } | null;
  initials: string | null;
  is_read: boolean;
  read_at: string | null;
  timestamp: string;
  created_at: string;
  updated_at: string | null;
}
