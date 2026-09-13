"use client";
import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useSelector } from "react-redux";
import Loader from "@/components/Loader";
import Login from "./Login";

const Layout = ({ children }) => {
  const { user, loading } = useSelector((state) => state.auth);
  const pathname = usePathname();
  const isBuilder = pathname.includes("/app/builder/");

  if (loading) {
    return <Loader />;
  }
  return (
    <div>
      {user ? (
        <div className={`min-h-screen bg-canvas ${isBuilder ? "" : "pt-[90px]"}`}>
          <Navbar />
          {children}
        </div>
      ) : (
        <Login />
      )}
    </div>
  );
};

export default Layout;
