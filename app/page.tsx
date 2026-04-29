'use client'

import React from 'react'
import { 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Mail
} from 'lucide-react'

export default function RegistrationsClosedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 font-inter">
      {/* Logo */}
      <div className="mb-8 animate-in fade-in zoom-in duration-700">
        <img
          src="/logo.jpeg"
          alt="Balkan-Ji-Bari Logo"
          className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white shadow-2xl object-contain bg-white"
        />
      </div>

      {/* Hero Section */}
      <div className="max-w-4xl w-full text-center space-y-6 mb-12">
        <div className="space-y-2 animate-in slide-in-from-top duration-700">
          <h1 className="font-poppins text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-800 leading-[1.2]">
            <span className="text-blue-600">BALKAN-JI-BARI</span>
            <br />
            SUMMER CAMP 2026
          </h1>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-700 leading-tight py-4 px-4">
            નડિયાદ બાલકન-જી-બારી આયોજિત
            <br />
            <span className="text-blue-600 italic">૩૫મો ગ્રીષ્મ શિબિર – ૨૦૨૬</span>
          </h2>
        </div>

        <div className="bg-white border-2 border-blue-600 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden group animate-in zoom-in duration-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
          
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 text-blue-600 mb-2">
              <CheckCircle2 size={48} />
            </div>
            
            <h3 className="text-4xl sm:text-5xl font-black text-slate-900 font-poppins uppercase tracking-tight">
              Thank You!
            </h3>
            
            <div className="space-y-4">
              <p className="text-xl sm:text-2xl font-bold text-slate-800 leading-relaxed max-w-2xl mx-auto">
                Registrations for Summer Camp Balkanji Bari 2026 Nadiad have been <span className="text-red-600 underline decoration-2 underline-offset-4 tracking-tight uppercase">closed</span>.
              </p>
              
              <div className="flex flex-col items-center gap-2 pt-4">
                <div className="flex items-center gap-2 text-slate-600 font-bold bg-slate-100 py-2 px-6 rounded-full">
                  <Clock size={20} className="text-blue-600" />
                  <span>OFFICE HOURS: 5:00 PM – 7:00 PM</span>
                </div>
                <p className="text-slate-500 font-medium text-sm sm:text-base mt-2">
                  For more information, please contact the Balkanji Bari office during office hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 animate-in slide-in-from-bottom duration-1000">
        {/* ID Card Collection Card */}
        <div className="bg-[#0a0f1d] text-white rounded-[2.5rem] p-8 shadow-xl border border-white/10 hover:border-blue-500/50 transition-all group">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Calendar size={24} />
            </div>
            <h4 className="text-xl font-bold uppercase tracking-tight">ID Card Collection</h4>
          </div>
          <div className="space-y-4">
            <p className="text-slate-300 font-medium leading-relaxed">
              ID CARD will be given in respective class during:
            </p>
            <div className="bg-white/10 border border-white/5 rounded-2xl p-6 text-center">
              <p className="text-3xl font-black text-blue-400 font-poppins">1 to 3 May 2026</p>
            </div>
            <p className="text-slate-400 text-sm italic">
              Please visit your respective classrooms as per your batch timings.
            </p>
          </div>
        </div>

        {/* Contact Card */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-200 hover:border-blue-600/30 transition-all group">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
              <Phone size={24} />
            </div>
            <h4 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Contact Information</h4>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white transition-colors">
              <div>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 leading-none">Secretary</p>
                <p className="font-bold text-slate-900 text-lg">Harishbhai: 9426546816</p>
              </div>
              <a href="tel:9426546816" className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-blue-600/20">
                <Phone size={20} />
              </a>
            </div>

            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white transition-colors">
              <div>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 leading-none">Coordinator</p>
                <p className="font-bold text-slate-900 text-lg">Pragneshbhai: 9898555933</p>
              </div>
              <a href="tel:9898555933" className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-blue-600/20">
                <Phone size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Social */}
      <div className="w-full max-w-4xl text-center space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-slate-500 font-bold text-sm">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-blue-600" />
            <span>Opposite R.T.O. Office, Mill Road, Nadiad</span>
          </div>
          <div className="hidden sm:block w-1 h-1 bg-slate-300 rounded-full" />
          <div className="flex items-center gap-2 underline underline-offset-4 decoration-blue-600/30">
            <Mail size={18} className="text-blue-600" />
            <span>info@balkanjibari.org</span>
          </div>
        </div>
        
        <div className="pt-6 border-t border-slate-200">
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">
            © 2026 Balkan-Ji-Bari, Nadiad. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
