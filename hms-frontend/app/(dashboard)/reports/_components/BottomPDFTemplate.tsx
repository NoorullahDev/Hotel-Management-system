"use client";

import React from "react";
import { Bed, User, CalendarCheck, Ban, MapPin, Phone, Mail } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface BottomPDFTemplateProps {
  roomStatus: {
    available: number;
    occupied: number;
    reserved: number;
    outOfOrder: number;
    total: number;
  };
  revenueSources: { name: string; pct: number; color: string }[];
  hotelAddress: string;
  contactNumber: string;
  email: string;
}

export default function BottomPDFTemplate({
  roomStatus,
  revenueSources,
  hotelAddress,
  contactNumber,
  email,
}: BottomPDFTemplateProps) {
  return (
    <div
      id="pdf-bottom-template"
      className="bg-white text-slate-900 absolute top-0 left-[-9999px] flex flex-col font-sans"
      style={{ width: "1000px", padding: "40px", paddingTop: "0" }}
    >
      <div className="flex gap-4 mb-8">
        {/* Room Status Overview */}
        <div className="flex-[1.5]">
          <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase mb-4">
            Room Status Overview
          </h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {/* Available */}
            <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-2">
                <Bed size={16} className="text-emerald-500" />
                <span className="text-2xl font-black text-slate-900">{roomStatus.available}</span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Available
              </span>
            </div>
            {/* Occupied */}
            <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-2">
                <User size={16} className="text-blue-500" />
                <span className="text-2xl font-black text-slate-900">{roomStatus.occupied}</span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Occupied
              </span>
            </div>
            {/* Reserved */}
            <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-2">
                <CalendarCheck size={16} className="text-purple-500" />
                <span className="text-2xl font-black text-slate-900">{roomStatus.reserved}</span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Reserved
              </span>
            </div>
            {/* Out of Order */}
            <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-2">
                <Ban size={16} className="text-slate-500" />
                <span className="text-2xl font-black text-slate-900">{roomStatus.outOfOrder}</span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Out of Order
              </span>
            </div>
          </div>
          <div className="text-center">
            <span className="text-[12px] font-semibold text-slate-600">
              Total Rooms: {roomStatus.total}
            </span>
          </div>
        </div>

        {/* Top Revenue Sources */}
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase mb-4">
            Top Revenue Sources
          </h3>
          <div className="flex items-center border border-slate-200 rounded-xl p-4 h-[120px]">
            <div className="w-[100px] h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueSources}
                    innerRadius={30}
                    outerRadius={45}
                    paddingAngle={2}
                    dataKey="pct"
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {revenueSources.map((entry, index) => (
                      <Cell key={\`cell-\${index}\`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 ml-4 flex-1">
              {revenueSources.map((src, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: src.color }}
                    ></div>
                    <span className="text-[11px] text-slate-600 font-medium">{src.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-900">{src.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <hr className="border-t border-slate-200 mb-6" />

      {/* Footer */}
      <div className="flex justify-between items-center mb-6 px-4">
        <div className="flex items-center gap-3">
          <MapPin size={16} className="text-slate-400" />
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-800">Eaglenest Hotel</span>
            <span className="text-[11px] text-slate-500">{hotelAddress}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {contactNumber && (
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-slate-400" />
              <span className="text-[11px] text-slate-600">{contactNumber}</span>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-slate-400" />
              <span className="text-[11px] text-slate-600">{email}</span>
            </div>
          )}
        </div>
        {/* We removed the Authorised Signature block here as requested. */}
      </div>
    </div>
  );
}
