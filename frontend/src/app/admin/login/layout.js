
import Image from "next/image";
import Link from "next/link";
import { React } from 'react';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-full flex-1 flex flex-row">
      {children}
      <div className="lg:w-1/2 w-full h-full bg-button-primary lg:grid items-center hidden">
        <div className="relative items-center justify-center  flex z-1">
          <div className="flex flex-col items-center max-w-xs">
            <Link href="/admin" className="mb-4">
              <Image
                className="object-cover border rounded-2xl"
                width={231}
                height={48}
                src="../../images/logo/header-logo.svg"
                alt="Logo"
              />
            </Link>
            <p className="text-center text-secondary">
              FoodieAI — a multi-agent LLM system for personalized restaurant
              and recipe recommendation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
