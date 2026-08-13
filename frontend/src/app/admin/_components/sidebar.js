'use client'
import React, { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSidebar } from "@/context/SidebarContext";
import HorizontalDots from "./Horizontal-dots";
import { HomeIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { UserGroupIcon } from "@heroicons/react/24/solid";
import { FaUtensils } from "react-icons/fa6";
import { TbDatabase } from "react-icons/tb";

export default function Sidebar() {
    const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();

    return (
        <aside
            className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-primary text-secondary h-screen transition-all duration-300 ease-in-out z-50 border-r border-primary 
        ${isExpanded || isMobileOpen
                    ? "w-72.5"
                    : isHovered
                        ? "w-72.5"
                        : "w-22.5"
                }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
            onMouseEnter={() => !isExpanded && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className={`flex  ${!isExpanded && !isHovered ? "lg:justify-center py-6" : "justify-start"
                    }`}
            >
                <Link href="/admin">
                    {isExpanded || isHovered || isMobileOpen ? (
                        <>
                            <Image
                                src="/images/logo/header-logo.png"
                                alt="Logo"
                                width={150}
                                height={40}
                            />
                        </>
                    ) : (
                        <Image
                            src="/images/logo/logo.svg"
                            alt="Logo"
                            width={90}
                            height={90}
                        />
                    )}
                </Link>
            </div>
            <div className="flex flex-col duration-300 ease-linear no-scrollbar">
                <nav className="mb-6">
                    <div className={`flex flex-col gap-4 ${!isExpanded && !isHovered
                        ? "justify-center items-center"
                        : "justify-start"
                        }`}>
                        <div>
                            <h2
                                className={`mb-4 text-xs uppercase flex leading-5 text-secondary/30 ${!isExpanded && !isHovered
                                    ? "lg:justify-center"
                                    : "justify-start"
                                    }`}
                            >
                                {isExpanded || isHovered || isMobileOpen ? (
                                    "Menu"
                                ) : (
                                    <HorizontalDots />
                                )}
                            </h2>
                            <ul className={`flex flex-col gap-4 ${!isExpanded && !isHovered
                                ? "lg:justify-center"
                                : "justify-start"
                                }`}>
                                <li>
                                    <Link href="/admin/dashboard" className="flex flex-row items-center justify-start gap-2">
                                        {isExpanded || isHovered || isMobileOpen ? (
                                            <div className="flex flex-row items-center justify-start gap-2">
                                                <HomeIcon className="w-5 h-5 text-secondary" />
                                                <span className="text-secondary font-medium">Dashboard</span>
                                            </div>

                                        ) : (
                                            <HomeIcon className="w-8 h-8 text-secondary" />
                                        )}
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/dashboard/users" className="flex flex-row items-center justify-start gap-2" >
                                        {isExpanded || isHovered || isMobileOpen ? (
                                            <div className="flex flex-row items-center justify-start gap-2">
                                                <UserGroupIcon className="w-5 h-5 text-secondary" />
                                                <span className="text-secondary font-medium">Users</span>
                                            </div>

                                        ) : (
                                            <UserGroupIcon className="w-8 h-8 text-secondary" />
                                        )}

                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/dashboard/restaurants" className="flex flex-row items-center justify-start gap-2">
                                        {isExpanded || isHovered || isMobileOpen ? (
                                            <div className="flex flex-row items-center justify-start gap-2">
                                                <FaUtensils className="w-5 h-5 text-secondary" />
                                                <span className="text-secondary font-medium">Restaurants</span>
                                            </div>

                                        ) : (
                                            <FaUtensils className="w-8 h-8 text-secondary" />
                                        )}

                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/dashboard/recipes" className="flex flex-row items-center justify-start gap-2">
                                        {isExpanded || isHovered || isMobileOpen ? (
                                            <div className="flex flex-row items-center justify-start gap-2">
                                                <BookOpenIcon className="w-5 h-5 text-secondary" />
                                                <span className="text-secondary font-medium">Recipes</span>
                                            </div>

                                        ) : (
                                            <BookOpenIcon className="w-8 h-8 text-secondary" />
                                        )}
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/dashboard/rag-index" className="flex flex-row items-center justify-start gap-2">
                                        {isExpanded || isHovered || isMobileOpen ? (
                                            <div className="flex flex-row items-center justify-start gap-2">
                                                <TbDatabase className="w-5 h-5 text-secondary" />
                                                <span className="text-secondary font-medium">RAG Index</span>
                                            </div>

                                        ) : (
                                            <TbDatabase className="w-8 h-8 text-secondary" />
                                        )}
                                    </Link>
                                </li>
                            </ul>
                        </div>

                    </div>
                </nav>
            </div>
        </aside>
    )
}