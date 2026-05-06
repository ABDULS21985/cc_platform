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
  bank_name?: string | null;
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
  source_account_number?: string | null;
  source_account_name: string | null;
  source_bank_code?: string | null;
  source_bank_name: string | null;
  destination_account_number?: string | null;
  destination_account_name?: string | null;
  destination_bank_name?: string | null;
  note?: string | null;
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

export interface TransactionDetailResponse {
  success: boolean;
  message: string;
  data: { transaction: TransactionData };
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
  provider?: string;
  using_fallback?: boolean;
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
  bank_name?: string;
  account_number: string;
  account_name?: string;
  note?: string;
  pin: string;
}

export interface WithdrawData {
  transaction_id: number;
  reference: string;
  amount: string;
  fee: string;
  net_amount: string;
  status: string;
  provider_status?: string;
  destination_bank: string;
  destination_bank_code?: string;
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
  /** Active post count, returned by the backend serializer. */
  posts_count?: number;
  /** Profile picture / avatar URL — backend field `community_profile_picture`. */
  community_profile_picture?: string | null;
  /** Cover banner URL — backend field `community_cover_photo` (alias of `banner_url`). */
  community_cover_photo?: string | null;
  banner_url?: string | null;
  name: string;
  organization_id: number;
  slug: string;
  status: string;
  visibility: string;
}

export interface CommunityListData {
  communities: CommunityData[];
  pagination?: { total?: number; limit?: number; offset?: number };
  total?: number;
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
  creator?: {
    id: number;
    firstname?: string | null;
    lastname?: string | null;
    full_name?: string | null;
    profile_photo?: string | null;
  } | null;
  description?: string;
  due_date: string;
  id: number;
  is_recurring: boolean;
  min_amount: number;
  paid_member_count?: number;
  expected_member_count?: number;
  progress_percentage?: number;
  member_payment_statuses?: BillMemberPaymentStatus[];
  recent_transactions?: CommunityTransaction[];
  recurrence_type?: string;
  status: string;
  title: string;
  type: "fixed" | "free_will" | string;
  updated_at: string;
}

export interface BillMemberPaymentStatus {
  member_id: number;
  user_id: number;
  role: string;
  status: "paid" | "pending";
  amount_paid: number;
  paid_at?: string | null;
  user?: {
    id: number;
    firstname?: string | null;
    lastname?: string | null;
    full_name?: string | null;
    profile_photo?: string | null;
  } | null;
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
  comments_count: number;
  reactions_count: number;
  current_user_reacted: boolean;
  current_user_reaction_type: string | null;
  mentioned_user_ids: number[];
  author: PostAuthor;
  mentions: PostMention[];
}

export interface PostCommentData {
  id: number;
  post_id: number;
  author_user_id: number;
  body: string;
  status: string;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  author: PostAuthor;
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

export interface PostCommentListResponse {
  success: boolean;
  message: string;
  data: {
    comments: PostCommentData[];
    pagination: Pagination;
  };
}

export interface PostReactionResponse {
  success: boolean;
  message: string;
  data: {
    post_id: number;
    reaction_type: string;
    reacted: boolean;
    reactions_count: number;
  };
}

export interface PayBillPayload {
  amount: number;
  payment_method: "wallet";
  transaction_reference?: string | null;
  /** Required for `payment_method: 'wallet'` — backend verifies via TransactionPinService. */
  pin?: string;
}

export interface CommunityBalanceData {
  community_id: number;
  balance: number;
  currency: string;
  status?: string | null;
  account_number?: string | null;
  account_name?: string | null;
  total_deposits?: number;
  total_withdrawals?: number;
  transaction_count?: number;
}

export interface CommunityBalanceResponse {
  success: boolean;
  message: string;
  data: CommunityBalanceData;
}

export interface CommunityTransaction {
  id: number;
  reference: string;
  type: string;
  direction?: "credit" | "debit" | string;
  amount: string | number;
  signed_amount?: string | null;
  net_amount?: string | number;
  description?: string | null;
  status: string;
  transaction_type?: string | null;
  community_id?: number | null;
  bill_id?: number | null;
  created_at: string;
  completed_at?: string | null;
  payer_name?: string | null;
  payment_method?: string | null;
  meta?: Record<string, any> | null;
  user?: {
    id: number;
    full_name?: string | null;
    email?: string | null;
  } | null;
  payer?: {
    id: number;
    firstname?: string | null;
    lastname?: string | null;
    full_name?: string | null;
    profile_photo?: string | null;
  } | null;
  virtual_account?: {
    account_number?: string | null;
    account_name?: string | null;
    bank_name?: string | null;
  } | null;
}

export interface CommunityTransactionsResponse {
  success: boolean;
  message: string;
  data: {
    transactions: CommunityTransaction[];
    pagination: Pagination;
  };
}

export interface CommunityTransferPayload {
  amount: number;
  recipient_account: string;
  recipient_name: string;
  recipient_bank_code: string;
  reason?: string;
  pin: string;
}

export interface PaymentData {
  transaction_id: number;
  bill_id?: number;
  reference?: string;
  amount: string | number;
  status: string;
  account_details?: any;
  instructions?: string;
  expires_in?: string;
  expires_in_seconds?: number;
  expires_at?: string;
  timestamp?: string;
  duplicate?: boolean;
  message?: string;
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

    sessions: {
      list: () =>
        axiosInstance.get<ApiResponse<{
          sessions: AuthSessionApi[];
          total: number;
        }>>("/v2/auth/sessions"),

      revoke: (id: number) =>
        axiosInstance.delete<ApiResponse<{ session: AuthSessionApi }>>(
          `/v2/auth/sessions/${id}`,
        ),

      revokeAllOthers: () =>
        axiosInstance.delete<ApiResponse<{ revoked_count: number }>>(
          "/v2/auth/sessions",
        ),
    },

    deactivation: {
      preflight: () =>
        axiosInstance.get<ApiResponse<{
          blockers: Array<{ kind: string; message: string; [key: string]: unknown }>;
          can_deactivate: boolean;
          grace_days: number;
        }>>("/v2/auth/deactivate/preflight"),

      deactivate: (data: { password: string; reason?: string }) =>
        axiosInstance.post<ApiResponse<{ deactivated_at: string }>>(
          "/v2/auth/deactivate",
          data,
        ),

      reactivate: () =>
        axiosInstance.post<ApiResponse<{}>>("/v2/auth/reactivate"),
    },
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

    getTransaction: (id: number) =>
      axiosInstance.get<TransactionDetailResponse>(`/v2/wallet/transactions/${id}`),
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
      sort?: 'recent' | 'popular' | 'newest';
      limit?: number;
      offset?: number;
    }) => axiosInstance.get<CommunityListResponse>("/v2/community", { params }),

    mine: (params?: {
      query?: string;
      interest_id?: number;
      visibility?: string;
      sort?: 'recent' | 'popular' | 'newest';
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
      sort?: 'recent' | 'popular' | 'newest';
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

    /** Aggregate community counts per Discover-page category label. */
    categoryCounts: (labels: string[]) =>
      axiosInstance.get<ApiResponse<{ counts: Record<string, number> }>>(
        "/v2/community/category-counts",
        { params: { label: labels } },
      ),

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
      axiosInstance.get<CommunityBalanceResponse>(`/v2/community/${id}/balance`),

    getTransactions: (
      id: number,
      params?: {
        limit?: number;
        offset?: number;
        type?: "credit" | "debit" | "deposit" | "withdrawal" | "transfer" | "payment";
        status?: "pending" | "completed" | "failed" | "reversed" | "successful";
        bill_id?: number;
      },
    ) =>
      axiosInstance.get<CommunityTransactionsResponse>(
        `/v2/community/${id}/transactions`,
        { params },
      ),

    transfer: (id: number, data: CommunityTransferPayload) =>
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

    uploadPostMedia: (formData: FormData) =>
      axiosInstance.post<
        ApiResponse<{
          media: {
            provider: string;
            asset_id: string;
            url: string;
            width: number | null;
            height: number | null;
            format: string | null;
            bytes: number | null;
            original_filename: string | null;
          }[];
          count: number;
        }>
      >("/v2/community/posts/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),

    getPostComments: (
      postId: number,
      params?: { limit?: number; offset?: number },
    ) =>
      axiosInstance.get<PostCommentListResponse>(
        `/v2/community/posts/${postId}/comments`,
        { params },
      ),

    createPostComment: (postId: number, data: { body: string }) =>
      axiosInstance.post<ApiResponse<PostCommentData>>(
        `/v2/community/posts/${postId}/comments`,
        data,
      ),

    togglePostReaction: (
      postId: number,
      data?: { reaction_type?: "like" },
    ) =>
      axiosInstance.post<PostReactionResponse>(
        `/v2/community/posts/${postId}/reactions`,
        data ?? { reaction_type: "like" },
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
      community_id?: number;
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

    getPreferences: () =>
      axiosInstance.get<ApiResponse<{ preferences: NotificationPreferencesApi }>>(
        "/v2/notifications/preferences",
      ),

    updatePreferences: (
      flags: Partial<Omit<NotificationPreferencesApi, "user_id" | "updated_at" | "security">>,
    ) =>
      axiosInstance.put<ApiResponse<{ preferences: NotificationPreferencesApi }>>(
        "/v2/notifications/preferences",
        flags,
      ),

    unreadByCategory: () =>
      axiosInstance.get<ApiResponse<{
        unread_by_category: Record<string, number>;
        total: number;
      }>>("/v2/notifications/unread-by-category"),

    unreadByCommunity: (communityId: number) =>
      axiosInstance.get<ApiResponse<{
        community_id: number;
        unread_count: number;
      }>>(`/v2/notifications/communities/${communityId}/unread-count`),

    listMutedCommunities: () =>
      axiosInstance.get<ApiResponse<{ community_ids: number[] }>>(
        "/v2/notifications/community-mutes",
      ),

    muteCommunity: (communityId: number) =>
      axiosInstance.post<ApiResponse<{ muted: boolean; community_id: number }>>(
        `/v2/notifications/community-mutes/${communityId}`,
      ),

    unmuteCommunity: (communityId: number) =>
      axiosInstance.delete<ApiResponse<{ muted: boolean; community_id: number }>>(
        `/v2/notifications/community-mutes/${communityId}`,
      ),

    deviceTokens: {
      register: (data: { fcm_token: string; platform?: 'web' | 'ios' | 'android' }) =>
        axiosInstance.post<ApiResponse<{ token: { id: number; platform: string } }>>(
          "/v2/notifications/device-tokens/",
          data,
        ),

      revoke: (data: { fcm_token: string }) =>
        axiosInstance.delete<ApiResponse<{}>>(
          "/v2/notifications/device-tokens/",
          { data },
        ),
    },
  },

  // =========================================================================
  // Bookmarks (saved items)
  // =========================================================================
  bookmarks: {
    list: (params?: { limit?: number; offset?: number; kind?: string }) =>
      axiosInstance.get<ApiResponse<{
        bookmarks: BookmarkApi[];
        pagination: { total: number; limit: number; offset: number };
      }>>("/v2/bookmarks/", { params }),

    create: (data: {
      kind: "post" | "event" | "community" | "bill" | "transaction" | "member";
      target_ref: string;
      title: string;
      description?: string;
      source?: string;
      href?: string;
      amount?: string | null;
      community_id?: number | null;
      community_name?: string | null;
    }) =>
      axiosInstance.post<ApiResponse<{ bookmark: BookmarkApi; already_saved: boolean }>>(
        "/v2/bookmarks/",
        data,
      ),

    delete: (id: number) =>
      axiosInstance.delete<ApiResponse<{ deleted: boolean }>>(
        `/v2/bookmarks/${id}`,
      ),
  },

  // =========================================================================
  // Events
  // =========================================================================
  events: {
    list: (params?: {
      scope?: "upcoming" | "live" | "hosting" | "past" | "all" | "suggested";
      community_id?: number;
      limit?: number;
      offset?: number;
    }) =>
      axiosInstance.get<ApiResponse<{
        events: EventApi[];
        pagination: { total: number; limit: number; offset: number };
      }>>("/v2/events/", { params }),

    create: (data: {
      title: string;
      description?: string;
      category?: string;
      starts_at: string;
      ends_at?: string;
      duration_label?: string;
      community_id?: number | null;
      location?: string;
      is_online?: boolean;
      is_private?: boolean;
      capacity?: number;
      ticket_price?: string | null;
      cover_image?: string | null;
      auto_approve_members?: boolean;
    }) =>
      axiosInstance.post<ApiResponse<{ event: EventApi }>>("/v2/events/", data),

    uploadCover: (formData: FormData) =>
      axiosInstance.post<ApiResponse<{
        cover_image: string;
        media: {
          provider?: string;
          asset_id?: string;
          url?: string;
          width?: number;
          height?: number;
          format?: string;
          bytes?: number;
          original_filename?: string;
        };
      }>>("/v2/events/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),

    get: (id: number) =>
      axiosInstance.get<ApiResponse<{ event: EventApi }>>(`/v2/events/${id}`),

    cancel: (id: number) =>
      axiosInstance.delete<ApiResponse<{ cancelled: boolean }>>(`/v2/events/${id}`),

    attend: (id: number) =>
      axiosInstance.post<ApiResponse<{ event: EventApi }>>(`/v2/events/${id}/attend`),

    cancelAttendance: (id: number) =>
      axiosInstance.delete<ApiResponse<{ event: EventApi }>>(`/v2/events/${id}/attend`),
  },

  // =========================================================================
  // Audit (user-facing activity log)
  // =========================================================================
  audit: {
    list: (params?: {
      limit?: number;
      offset?: number;
      category?: "money" | "security" | "admin" | "system";
      severity?: "info" | "warning" | "critical";
    }) =>
      axiosInstance.get<ApiResponse<{
        events: AuditApi[];
        pagination: { total: number; limit: number; offset: number };
      }>>("/v2/audit/", { params }),
  },

  // =========================================================================
  // Subscriptions (recurring user-scoped outflows)
  // =========================================================================
  subscriptions: {
    list: (params?: { status?: 'active' | 'paused' | 'cancelled'; limit?: number; offset?: number }) =>
      axiosInstance.get<ApiResponse<{
        subscriptions: SubscriptionApi[];
        total: number;
      }>>("/v2/subscriptions/", { params }),

    create: (data: SubscriptionCreatePayload) =>
      axiosInstance.post<ApiResponse<{ subscription: SubscriptionApi }>>(
        "/v2/subscriptions/",
        data,
      ),

    setStatus: (id: number, status: 'active' | 'paused' | 'cancelled') =>
      axiosInstance.patch<ApiResponse<{ subscription: SubscriptionApi }>>(
        `/v2/subscriptions/${id}`,
        { status },
      ),

    delete: (id: number) =>
      axiosInstance.delete<ApiResponse<{}>>(`/v2/subscriptions/${id}`),
  },

  // =========================================================================
  // Standing instructions (kind=standing_instruction view of subscriptions)
  // =========================================================================
  standingInstructions: {
    list: (params?: { status?: 'active' | 'paused' | 'cancelled'; limit?: number; offset?: number }) =>
      axiosInstance.get<ApiResponse<{
        subscriptions: SubscriptionApi[];
        total: number;
      }>>("/v2/standing-instructions/", { params }),

    create: (data: StandingInstructionCreatePayload) =>
      axiosInstance.post<ApiResponse<{ subscription: SubscriptionApi }>>(
        "/v2/standing-instructions/",
        data,
      ),

    verifyPin: (data: { pin: string }) =>
      axiosInstance.post<ApiResponse<{ verified: boolean }>>(
        "/v2/standing-instructions/pin/verify",
        data,
      ),

    setStatus: (id: number, status: 'active' | 'paused' | 'cancelled') =>
      axiosInstance.patch<ApiResponse<{ subscription: SubscriptionApi }>>(
        `/v2/standing-instructions/${id}`,
        { status },
      ),

    delete: (id: number) =>
      axiosInstance.delete<ApiResponse<{}>>(`/v2/standing-instructions/${id}`),
  },

  // =========================================================================
  // Discovery (trending topics)
  // =========================================================================
  discovery: {
    trending: (params?: { limit?: number }) =>
      axiosInstance.get<ApiResponse<{ topics: TrendingTopicApi[] }>>(
        "/v2/discovery/trending",
        { params },
      ),
  },
};

export interface TrendingTopicApi {
  tag: string;
  category: string;
  posts: number;
  velocity: "rising" | "hot" | "steady";
  community_ids: number[];
}

export interface AuditApi {
  id: number;
  user_id: number;
  category: "money" | "security" | "admin" | "system";
  severity: "info" | "warning" | "critical";
  action: string;
  details: string;
  actor: string;
  target: string | null;
  ip: string | null;
  device: string | null;
  hashPrefix: string;
  timestamp: string;
  created_at: string;
}

export interface EventApi {
  id: number;
  community_id: number | null;
  creator_id: number | null;
  title: string;
  description: string;
  category: string | null;
  starts_at: string;
  ends_at: string | null;
  duration_label: string | null;
  location: string;
  is_online: boolean;
  is_private: boolean;
  capacity: number;
  ticket_price: string | null;
  cover_image: string | null;
  auto_approve_members?: boolean;
  requires_payment?: boolean;
  payment_supported?: boolean;
  ticketing_status?: "free" | "paid_unsupported";
  community_name: string | null;
  community_initial: string;
  status: "upcoming" | "live" | "past";
  attendees: number;
  is_attending: boolean;
  is_hosting: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface BookmarkApi {
  id: number;
  user_id: number;
  kind: "post" | "event" | "community" | "bill" | "transaction" | "member";
  target_ref: string;
  title: string;
  description: string;
  source: string;
  href: string;
  amount: string | null;
  community: { id: string; name: string } | null;
  savedAt: string;
  created_at: string;
  updated_at: string | null;
}

export interface NotificationPreferencesApi {
  user_id: number;
  money: boolean;
  bills: boolean;
  communities: boolean;
  events: boolean;
  /** Always true server-side; surfaced as locked in the UI. */
  security: true;
  system: boolean;
  digest_frequency: 'off' | 'daily' | 'weekly';
  last_digest_at: string | null;
  updated_at: string | null;
}

export interface SubscriptionApi {
  id: number;
  user_id: number;
  kind: 'subscription' | 'standing_instruction';
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  cadence: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_at: string | null;
  end_at: string | null;
  next_charge_at: string | null;
  last_charged_at: string | null;
  status: 'active' | 'paused' | 'cancelled';
  counterparty_type: string | null;
  counterparty_id: number | null;
  source_bill_id: number | null;
  destination_account_number: string | null;
  destination_bank_code: string | null;
  destination_account_name: string | null;
  split_member_name: string | null;
  split_primary_amount: number | null;
  split_secondary_amount: number | null;
  pin_required: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface SubscriptionCreatePayload {
  name: string;
  description?: string | null;
  amount: number | string;
  currency?: string;
  cadence?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_at?: string | null;
  end_at?: string | null;
  next_charge_at?: string | null;
  counterparty_type?: string | null;
  counterparty_id?: number | null;
  source_bill_id?: number | null;
}

export interface StandingInstructionCreatePayload extends SubscriptionCreatePayload {
  destination_account_number: string;
  destination_bank_code: string;
  destination_account_name: string;
  split_member_name?: string | null;
  split_primary_amount?: number | string | null;
  split_secondary_amount?: number | string | null;
  pin: string;
}

export interface AuthSessionApi {
  id: number;
  user_id: number;
  device_label: string | null;
  browser: string | null;
  os: string | null;
  ip: string | null;
  location: string | null;
  last_seen_at: string | null;
  created_at: string | null;
  revoked_at: string | null;
  is_active: boolean;
}

export interface NotificationApi {
  id: number;
  user_id: number;
  community_id: number | null;
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
