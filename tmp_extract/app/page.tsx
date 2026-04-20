'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  Music, Palette, BookOpen, Trophy,
  MapPin, Clock, Calendar, CheckCircle2,
  ArrowRight, Phone, Mail, Sparkles,
  Smartphone, UserCheck, ShieldCheck, Facebook, ExternalLink
} from 'lucide-react'

const SUBJECTS = [
  { no: 1, name: "Music", time: "9:00 AM – 10:00 AM", age: "10-16", fee: 500, icon: <Music className="text-fuchsia-500" /> },
  { no: 2, name: "Tabla", time: "5:00 PM – 6:00 PM", age: "10-16", fee: 500, icon: <Music className="text-orange-500" /> },
  { no: 3, name: "Drum Class", time: "6:00 PM – 7:00 PM", age: "12-16", fee: 500, icon: <Music className="text-blue-500" /> },
  { no: 4, name: "Keyboard (Casio)", time: "6:00 PM – 7:00 PM", age: "10-16", fee: 500, icon: <Music className="text-purple-500" /> },
  { no: 5, name: "YouTube Training", time: "9:00 AM – 10:00 AM", age: "10-16", fee: 500, icon: <Smartphone className="text-red-500" /> },
  { no: 6, name: "Spoken English", time: "7:00 PM – 8:00 PM", age: "12-16", fee: 600, icon: <BookOpen className="text-indigo-500" /> },
  { no: 7, name: "Skating", time: "7-8 AM, 6-7, 7-8, 8-9 PM", age: "4-16", fee: 600, icon: <Trophy className="text-emerald-500" /> },
  { no: 8, name: "Badminton", time: "6:00 PM – 7:00 PM", age: "12-16", fee: 1000, icon: <Trophy className="text-yellow-500" /> },
  { no: 9, name: "Table Tennis", time: "7-8 AM OR 6-7 PM", age: "10-16", fee: 600, icon: <Trophy className="text-cyan-500" /> },
  { no: 10, name: "Karate", time: "7:00 PM – 8:00 PM", age: "10-16", fee: 500, icon: <ShieldCheck className="text-red-600" /> },
  { no: 11, name: "Western Dance", time: "10:00 AM – 11:00 AM", age: "10-16", fee: 700, icon: <Sparkles className="text-pink-600" /> },
  { no: 12, name: "Yogasan", time: "7:00 AM – 8:00 AM", age: "5-15", fee: 300, icon: <UserCheck className="text-green-600" /> },
  { no: 13, name: "Mehendi", time: "5-6 PM OR 6-7 PM", age: "10-16", fee: 500, icon: <Palette className="text-rose-500" /> },
  { no: 14, name: "Pencil Sketch", time: "5-6 PM OR 6-7 PM", age: "7-16", fee: 600, icon: <Palette className="text-blue-600" /> },
  { no: 15, name: "Calligraphy", time: "10:00 AM – 11:00 AM", age: "9-16", fee: 400, icon: <Palette className="text-indigo-600" /> },
  { no: 16, name: "Guitar", time: "8:00 AM – 9:00 AM", age: "9-16", fee: 500, icon: <Music className="text-amber-600" /> },
  { no: 17, name: "Bharat Natyam", time: "11:00 AM – 12:00 PM", age: "10-16", fee: 500, icon: <Sparkles className="text-orange-600" /> },
  { no: 18, name: "Abacus and Brain Dev", time: "11:00 AM – 12:00 PM", age: "7-16", fee: 700, icon: <BookOpen className="text-violet-600" /> },
  { no: 20, name: "Vedic Maths", time: "5:00 PM – 6:00 PM", age: "9-16", fee: 500, icon: <BookOpen className="text-emerald-600" /> },
  { no: 21, name: "Kathak Dance", time: "5:00 PM – 6:00 PM", age: "6-16", fee: 500, icon: <Sparkles className="text-rose-600" /> },
  { no: 22, name: "Zumba", time: "6:00 PM – 7:00 PM", age: "6-16", fee: 500, icon: <Sparkles className="text-lime-600" /> },
  { no: 23, name: "Karaoke", time: "10:00 AM – 11:00 AM", age: "10-16", fee: 500, icon: <Music className="text-fuchsia-600" /> },
  { no: 24, name: "Mind Power Mastery", time: "8:00 AM – 9:00 AM", age: "14-17", fee: 500, icon: <UserCheck className="text-blue-700" /> },
]

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-x-hidden relative font-inter flex flex-col items-center">

      {/* Centered Logo at Top */}
      <div className="relative z-50 pt-8 pb-2 flex justify-center w-full">
        <div className="relative group">

          <img
            src="/logo.jpeg"
            alt="Balkan-Ji-Bari Logo"
            className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white dark:border-slate-800 shadow-2xl object-contain bg-white"
          />
        </div>
      </div>

      {/* Hero Section (Revised) */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center pt-2 pb-6 sm:pb-12 px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-8">

          <div className="space-y-4">
            <h1 className="font-poppins text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-800 dark:text-white leading-[1.2]">
              <span className="text-primary">
                BALKAN-JI-BARI
              </span><br />
              SUMMER CAMP 2026
            </h1>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-slate-800 dark:text-indigo-200 leading-tight py-2">
              નડિયાદ બાલકન-જી-બારી આયોજિત<br />
              <br />
              <span className="text-primary italic dark:text-primary-foreground">૩૫મો ગ્રીષ્મ શિબિર – ૨૦૨૬</span>
            </h2>
          </div>

          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg font-medium max-w-2xl mx-auto leading-relaxed">
            Unleash your creativity and skills this summer!
            <br />Join our month-long camp
            from <span className="font-bold text-slate-900 dark:text-white border-b-2 border-primary/30">May 1st to May 31st, 2026</span>.
          </p>

          <div className="pt-6 flex flex-col items-center gap-4">
            <button
              onClick={() => router.push('/register')}
              className="group relative inline-flex items-center gap-3 px-8 py-4 sm:px-10 sm:py-5 bg-primary text-white rounded-3xl font-poppins font-bold text-lg sm:text-xl shadow-2xl shadow-primary/30 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
            >
              New Student Registration
              <ArrowRight size={26} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => router.push('/login')}
              className="font-inter text-slate-500 hover:text-primary font-bold text-sm sm:text-base transition-colors flex items-center gap-2 group"
            >
              Already Registered? <span className="underline decoration-primary/30 underline-offset-4 group-hover:decoration-primary transition-all">Student Login</span>
            </button>
          </div>

        </div>
      </section>

      {/* Instructions & Contact Section */}
      <section className="relative z-10 w-full py-12 bg-[#0a0f1d] dark:bg-slate-50 text-white dark:text-slate-900 px-4 border-t border-white/5 dark:border-slate-200 transition-colors duration-500">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Instructions Column */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              <h3 className="text-2xl sm:text-3xl font-bold uppercase text-white dark:text-slate-900 flex items-center justify-center sm:justify-start gap-4 italic text-center sm:text-left">
                <span className="hidden sm:block w-16 h-1 bg-primary rounded-full shrink-0"></span>
                <span className="shrink-0">IMPORTANT INSTRUCTIONS</span>
                <span className="hidden sm:block w-16 h-1 bg-primary rounded-full shrink-0"></span>
              </h3>
              <p className="text-slate-300 dark:text-slate-500 font-medium max-w-lg leading-relaxed text-center sm:text-left">
                Please read carefully before proceeding with the registration.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6">
              {/* Box 1 */}
              <div className="bg-white/5 dark:bg-slate-100 border border-white/10 dark:border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 transition-all hover:bg-white/10 dark:hover:bg-slate-200 hover:border-primary/50 group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-primary/20">1</div>
                  <h4 className="text-lg font-bold text-white dark:text-slate-800 uppercase tracking-tight">CASH PAYMENT</h4>
                </div>
                <div className="space-y-2">
                  <p className="text-blue-300 dark:text-slate-600 font-semibold text-sm italic">Visit: April 15th - April 25th</p>
                  <p className="text-primary font-bold text-sm tracking-wide bg-primary/10 dark:bg-primary/5 py-1 px-3 rounded-md inline-block">5:00 PM – 7:00 PM</p>
                  <p className="text-slate-400 dark:text-slate-500 text-[13px] leading-relaxed border-t border-white/10 dark:border-slate-200 pt-3 mt-3">
                    રોકડ ચૂકવણી દ્વારા પ્રવેશ માટે, ૧૫ થી ૨૫ એપ્રિલ દરમિયાન સાંજે ૫:૦૦ થી ૭:૦૦ વાગ્યા સુધી બાળકાંજી ની બારી, નડિયાદ ઓફિસમાં રૂબરૂ આવવું.
                  </p>
                </div>
              </div>

              {/* Box 2 */}
              <div className="bg-white/5 dark:bg-slate-100 border border-white/10 dark:border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 transition-all hover:bg-white/10 dark:hover:bg-slate-200 hover:border-primary/50 group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-primary/20">2</div>
                  <h4 className="text-lg font-bold text-white dark:text-slate-800 uppercase tracking-tight">FORM ASSISTANCE</h4>
                </div>
                <div className="space-y-3">
                  <p className="text-slate-300 dark:text-slate-600 text-sm leading-relaxed">Need help with the form? Visit the office for assistance.</p>
                  <p className="text-slate-400 dark:text-slate-500 text-[13px] leading-relaxed border-t border-white/10 dark:border-slate-200 pt-3 mt-3">
                    ઓનલાઈન ફોર્મ ભરવામાં મદદ જોઈતી હોય તેવા વિદ્યાર્થીઓ પણ ઉક્ત સમય દરમિયાન ઓફિસની મુલાકાત લઈ શકે છે.
                  </p>
                </div>
              </div>
            </div>

            {/* Box 3 */}
            <div className="bg-white/5 dark:bg-slate-100 border border-white/10 dark:border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 transition-all hover:bg-white/10 dark:hover:bg-slate-200 hover:border-primary/50 group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-primary/20">3</div>
                <h4 className="text-lg font-bold text-white dark:text-slate-800 uppercase tracking-tight">ID CARD COLLECTION</h4>
              </div>
              <p className="text-slate-300 dark:text-slate-600 text-sm leading-relaxed">
                ID CARD will be given in respective class during <span className="text-primary font-bold">1 to 3 May 2026</span>.
              </p>
            </div>
          </div>

          {/* Contact Card Column */}
          <div className="lg:col-span-5">
            <div className="bg-[#0d1425] dark:bg-white border border-white/10 dark:border-slate-200 rounded-[2.5rem] p-6 sm:p-7 shadow-xl dark:shadow-2xl relative overflow-hidden group transition-colors duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32 transition-opacity group-hover:opacity-100"></div>

              <div className="relative z-10 space-y-6">
                <div className="space-y-1">
                  <h4 className="text-2xl font-bold text-white dark:text-slate-900 uppercase italic">Contact & Location</h4>
                  <div className="w-12 h-1 bg-primary rounded-full"></div>
                </div>

                <div className="space-y-6">
                  {/* Location */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 dark:bg-primary/10 flex items-center justify-center text-primary transition-all">
                      <MapPin size={22} />
                    </div>
                    <p className="font-bold text-base leading-snug text-slate-200 dark:text-slate-700">
                      Opposite R.T.O. Office, Mill Road,<br />Nadiad – 387001
                    </p>
                  </div>

                  {/* Contacts */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 dark:bg-blue-500/10 flex items-center justify-center text-blue-300 dark:text-blue-600 border border-blue-400/20">
                          <Phone size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-blue-400 dark:text-blue-500 tracking-widest leading-none mb-1">Secretary</p>
                          <p className="font-bold text-sm text-white dark:text-slate-800">Harishbhai: 9426546816</p>
                        </div>
                      </div>
                      <a href="tel:9426546816" className="px-5 py-2 bg-blue-500/10 hover:bg-blue-500 text-blue-300 dark:text-blue-600 hover:text-white text-[11px] font-bold rounded-full transition-all border border-blue-400/20">
                        Call
                      </a>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 dark:bg-blue-500/10 flex items-center justify-center text-blue-300 dark:text-blue-600 border border-blue-400/20">
                          <Phone size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-blue-400 dark:text-blue-500 tracking-widest leading-none mb-1">Coordinator</p>
                          <p className="font-bold text-sm text-white dark:text-slate-800">Prajeshbhai: 9898555933</p>
                        </div>
                      </div>
                      <a href="tel:9898555933" className="px-5 py-2 bg-blue-500/10 hover:bg-blue-500 text-blue-300 dark:text-blue-600 hover:text-white text-[11px] font-bold rounded-full transition-all border border-blue-400/20">
                        Call
                      </a>
                    </div>
                  </div>

                  {/* Email & Facebook */}
                  <div className="space-y-3 border-t border-white/5 dark:border-slate-200 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 dark:bg-blue-500/10 flex items-center justify-center text-blue-300 dark:text-blue-600 border border-blue-400/20">
                        <Mail size={20} />
                      </div>
                      <p className="font-bold text-sm text-blue-200 dark:text-slate-700">info@balkanjibari.org</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-300 border border-blue-400/20">
                        <Facebook size={20} />
                      </div>
                      <a href="https://www.facebook.com/nadiadbalkanjibari/" target="_blank" rel="noopener noreferrer" className="font-bold text-sm text-slate-700 dark:text-blue-200 hover:text-blue-600 dark:hover:text-white transition-colors flex items-center gap-2">
                        Join with us <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Office Hours */}
                <div className="pt-6 border-t border-slate-200 dark:border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black uppercase text-blue-600 dark:text-blue-300">Office Hours</p>
                    <div className="px-3 py-1 bg-primary/10 text-blue-600 dark:text-blue-300 rounded-full text-[12px] font-bold uppercase tracking-tighter transition-all group-hover:bg-primary/20">Mon – Sat</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-base bg-slate-100 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                      <p className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[11px] tracking-wider">Morning</p>
                      <p className="font-bold text-slate-800 dark:text-white text-xl">10:00 AM - 12:00 PM</p>
                    </div>
                    <div className="flex items-center justify-between text-base bg-slate-100 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                      <p className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[11px] tracking-wider">Evening</p>
                      <p className="font-bold text-slate-800 dark:text-white text-xl">05:00 PM - 08:00 PM</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full py-6 px-4 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-400 font-bold uppercase text-[10px]">
            © 2026 Balkan-Ji-Bari, Nadiad.
          </p>
        </div>
      </footer>

    </div>
  )
}
