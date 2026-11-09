import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";
import { LogoMark } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="flex items-center gap-3 text-3xl font-bold">
        <LogoMark size={40} />
        Admin
      </h1>
      <AdminApp />
    </div>
  );
}
