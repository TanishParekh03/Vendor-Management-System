export type ApiErrorResponse = {
  msg: string
}

export class ApiRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiRequestError"
    this.status = status
  }
}

export type BackendVendor = {
  id: number
  user_id: string
  name: string
  phone_number: string
}

export type BackendCommodity = {
  id: number
  user_id: string
  name: string
  quantity: number
  unit: string
}

export type BackendBill = {
  id: number
  vendor_id: number
  user_id: string
  total_amount: number | string
  paid_amount: number | string
  status: string
  date?: string
}

export type BackendPaymentLog = {
  id: number
  user_id: string
  vendor_id: number
  bill_id: number
  amount_paid: number | string
  payment_mode: string
  payment_date?: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000"

function getErrorMessage(fallback: string, payload: unknown): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "msg" in payload &&
    typeof (payload as ApiErrorResponse).msg === "string"
  ) {
    return (payload as ApiErrorResponse).msg
  }

  return fallback
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  const rawText = await response.text()
  const payload = rawText ? (JSON.parse(rawText) as unknown) : null

  if (!response.ok) {
    const message = getErrorMessage(`Request failed with status ${response.status}`, payload)
    throw new ApiRequestError(response.status, message)
  }

  return payload as T
}

async function getListOrEmpty<T>(loader: () => Promise<T[]>): Promise<T[]> {
  try {
    return await loader()
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return []
    }

    throw error
  }
}

export function getCurrentUserId(): string {
  const fromEnv = String(import.meta.env.VITE_DEFAULT_USER_ID ?? "").trim()
  if (fromEnv.length > 0) {
    return fromEnv
  }

  throw new Error("Missing VITE_DEFAULT_USER_ID in react_frontend/.env")
}

export async function getVendors(userId: string): Promise<BackendVendor[]> {
  return getListOrEmpty(async () => {
    const data = await request<{ vendors: BackendVendor[] }>(`/users/${userId}/vendors`)
    return data.vendors
  })
}

export async function addVendor(
  userId: string,
  payload: { name: string; phone_number: string }
): Promise<BackendVendor> {
  const data = await request<{ vendor: BackendVendor }>(`/users/${userId}/vendors`, {
    method: "POST",
    body: JSON.stringify(payload),
  })

  return data.vendor
}

export async function updateVendor(
  userId: string,
  vendorId: number,
  payload: { name?: string; phone_number?: string }
): Promise<void> {
  await request<{ success: boolean; msg: string }>(`/users/${userId}/vendors/${vendorId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function getVendorCommodities(userId: string, vendorId: number): Promise<BackendCommodity[]> {
  return getListOrEmpty(async () => {
    const data = await request<{ commodities: BackendCommodity[] }>(`/users/${userId}/vendors/${vendorId}/commodities`)
    return data.commodities
  })
}

export async function getVendorBills(userId: string, vendorId: number): Promise<BackendBill[]> {
  return getListOrEmpty(async () => {
    const data = await request<{ bills: BackendBill[] }>(`/users/${userId}/vendors/${vendorId}/bills`)
    return data.bills
  })
}

export async function getVendorPaymentLogs(userId: string, vendorId: number): Promise<BackendPaymentLog[]> {
  return getListOrEmpty(async () => {
    const data = await request<{ payment_logs: BackendPaymentLog[] }>(
      `/users/${userId}/vendors/${vendorId}/payment-logs`
    )
    return data.payment_logs
  })
}

export async function getCommodities(userId: string): Promise<BackendCommodity[]> {
  return getListOrEmpty(async () => {
    const data = await request<{ commodities: BackendCommodity[] }>(`/users/${userId}/commodities`)
    return data.commodities
  })
}

export async function getCommodityVendors(userId: string, commodityId: number): Promise<BackendVendor[]> {
  return getListOrEmpty(async () => {
    const data = await request<{ vendors: BackendVendor[] }>(
      `/users/${userId}/commodities/${commodityId}/vendors`
    )
    return data.vendors
  })
}

export async function linkCommodityToVendor(
  userId: string,
  vendorId: number,
  commodityId: number
): Promise<void> {
  await request<{ success: boolean; msg: string }>(`/users/${userId}/vendors/${vendorId}/commodities`, {
    method: "POST",
    body: JSON.stringify({ commodity_id: commodityId }),
  })
}
