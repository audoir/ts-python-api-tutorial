"use client";

import { useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import TabNavigation from "@/app/components/TabNavigation";
import NextjsCrud from "@/app/components/NextjsCrud";
import ExpressCrud from "@/app/components/ExpressCrud";
import NestjsCrud from "@/app/components/NestjsCrud";
import NestjsAdvanced from "@/app/components/NestjsAdvanced";
import FlaskCrud from "@/app/components/FlaskCrud";
import FastapiCrud from "@/app/components/FastapiCrud";

type MainTab = "nextjs-crud" | "express-crud" | "nestjs-crud" | "nestjs-advanced" | "flask-crud" | "fastapi-crud";

export default function Home() {
  const [mainTab, setMainTab] = useState<MainTab>("nextjs-crud");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 font-sans">
      <PageHeader />
      <TabNavigation activeTab={mainTab} onTabChange={(tab) => setMainTab(tab)} />
      <div className={mainTab === "nextjs-crud" ? undefined : "hidden"}>
        <NextjsCrud />
      </div>
      <div className={mainTab === "express-crud" ? undefined : "hidden"}>
        <ExpressCrud />
      </div>
      <div className={mainTab === "nestjs-crud" ? undefined : "hidden"}>
        <NestjsCrud />
      </div>
      <div className={mainTab === "nestjs-advanced" ? undefined : "hidden"}>
        <NestjsAdvanced />
      </div>
      <div className={mainTab === "flask-crud" ? undefined : "hidden"}>
        <FlaskCrud />
      </div>
      <div className={mainTab === "fastapi-crud" ? undefined : "hidden"}>
        <FastapiCrud />
      </div>
    </div>
  );
}
