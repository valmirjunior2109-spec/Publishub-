import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-3xl font-bold">Admin</h1>
      <AdminApp />
    </div>
  );
}
