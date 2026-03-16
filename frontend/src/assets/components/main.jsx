import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import leftimg from '../../../public/imgleft.png'

export default function CyberCrimePortal() {
  const navigate = useNavigate()
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 0,
      type: 'azadi',
      message: 'Celebrating Digital India'
    },
    {
      id: 1,
      type: 'awareness',
      message: 'Stay Safe Online - Report Cyber Crime'
    },
    {
      id: 2,
      type: 'security',
      message: 'Together Against Cyber Crime'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-blue-500 py-2 px-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="text-white text-xs">
            <div className="font-bold">भारत सरकार</div>
            <div>GOVERNMENT OF INDIA</div>
          </div>
          <div className="text-white text-xs">
            <div className="font-bold">रक्षा मंत्रालय</div>
            <div>MINISTRY OF DEFENCE</div>
          </div>
        </div>
        <button className="bg-white text-blue-600 px-4 py-1 rounded text-sm font-semibold flex items-center gap-2">
          Language
          <span className="text-lg">🌐</span>
        </button>
      </div>

      {/* Logo and Title Bar */}
      <div className="bg-white border-b border-gray-200 py-4 px-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/1200px-Emblem_of_India.svg.png" 
            alt="Emblem of India" 
            className="h-16"
          />
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-blue-600">
              <span className="text-orange-500">I</span>
              <span className="text-green-500">4</span>
              <span className="relative">
                <span className="text-blue-600">C</span>
              </span>
            </div>
            <div>
              <div className="text-xs text-gray-600">Indian</div>
              <div className='text-xs text-gray-600'>Cyber</div>
              <div className="text-xs text-gray-600">Crime</div>
              <div className="text-xs text-gray-600">Coordination</div>
              <div className="text-xs text-gray-600">Centre</div>
            </div>
          </div>
          <div className="ml-8">
            <div className="text-xl font-bold text-gray-800">राष्ट्रीय साइबर अपराध रिपोर्टिंग पोर्टल</div>
            <div className="text-2xl font-bold text-gray-900">National Cyber Crime Reporting Portal</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <img src={leftimg} alt="" className="h-25 w-25"/>
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Flag_of_India.png/1200px-Flag_of_India.png" 
            alt="Indian Flag" 
            className="h-12"
          />
          
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="bg-blue-500 py-3 px-6 flex justify-end">
        <div className="flex items-right gap-6 text-white">
          {/* <button className="hover:bg-blue-600 px-4 py-2 rounded">
            <span className="text-xl">🏠</span>
          </button> */}
          <button 
            className="hover:bg-blue-600 px-4 py-2 rounded font-semibold"
            onClick={()=>navigate('/workflow')}
          >
            View System Workflow 🎯
          </button>
          <button className="hover:bg-blue-600 px-4 py-2 rounded font-semibold" 
          onClick={()=>navigate('/auth')}>
            Login / SignUp
          </button>
        </div>
      </nav>

      {/* Main Slider Section */}
      <div className="relative bg-gradient-to-b from-blue-50 to-white overflow-hidden h-[500px] border-b-4 border-orange-500">
        {/* Slider Container with Transform */}
        <div 
          className="flex h-full transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="min-w-full h-full flex items-center justify-center px-12"
            >
              <div className="w-full max-w-7xl">
                {slide.type === 'azadi' ? (
                  <div className="flex items-center justify-between gap-8">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center">
                          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-sm">75</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-5xl font-bold">
                            <span className="text-orange-500">Azadi</span>
                            <span className="text-gray-800"> Ka</span>
                          </div>
                          <div className="text-5xl font-bold">
                            <span className="text-gray-800">Amrit </span>
                            <span className="text-green-600">Mahotsav</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 text-lg leading-relaxed max-w-xl">
                        India celebrates 75 years of independence with a commitment to digital safety and cyber security for all citizens.
                      </p>
                    </div>
                    <img 
                      src="https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=600&h=400&fit=crop" 
                      alt="India Gate" 
                      className="w-96 h-80 object-cover rounded-lg shadow-xl border-4 border-white"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-12">
                    <img 
                      src={slide.type === 'awareness' 
                        ? 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&h=400&fit=crop'
                        : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=400&fit=crop'
                      }
                      alt="Cyber Security" 
                      className="w-96 h-80 object-cover rounded-lg shadow-xl border-4 border-white"
                    />
                    <div className="flex-1">
                      <h2 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                        {slide.message}
                      </h2>
                      <p className="text-gray-700 text-lg leading-relaxed">
                        Report cyber crimes and help make India's digital ecosystem safer for everyone.
                      </p>
                      <button 
                        className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors"
                      >
                        Report Crime Now →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-100 text-blue-600 p-2 rounded-full transition-all z-20 shadow-lg"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button 
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-100 text-blue-600 p-2 rounded-full transition-all z-20 shadow-lg"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Slide Indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide ? 'bg-blue-600 w-8' : 'bg-gray-400 w-2'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content Section */}
      <div className="px-8 py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Report Crime Card */}
            <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow border-l-4 border-blue-600">
              <div className="p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">📱</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Report Cyber Crime</h3>
                <p className="text-gray-600 mb-4">File a complaint online for cyber crimes including financial fraud, social media crimes, and online harassment.</p>
                <button 
                  className="text-blue-600 font-semibold hover:text-blue-800"
                >
                  Report Now →
                </button>
              </div>
            </div>

            {/* Track Complaint Card */}
            <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow border-l-4 border-green-600">
              <div className="p-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">🔍</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Track Your Complaint</h3>
                <p className="text-gray-600 mb-4">Check the status of your registered cyber crime complaint using your acknowledgment number.</p>
                <button className="text-green-600 font-semibold hover:text-green-800">
                  Track Status →
                </button>
              </div>
            </div>

            {/* Helpline Card */}
            <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow border-l-4 border-orange-600">
              <div className="p-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">☎️</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">24x7 Helpline</h3>
                <p className="text-gray-600 mb-4">Get immediate assistance for cyber crime related queries and support.</p>
                <div className="text-2xl font-bold text-orange-600">1930</div>
              </div>
            </div>
          </div>

          {/* Statistics and Updates Section */}
          <div className="grid grid-cols-4 gap-6">
            {/* Stat Cards */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <div className="text-4xl font-bold mb-2">1.5M+</div>
              <div className="text-blue-100">Complaints Registered</div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
              <div className="text-4xl font-bold mb-2">₹500Cr+</div>
              <div className="text-green-100">Amount Recovered</div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
              <div className="text-4xl font-bold mb-2">50K+</div>
              <div className="text-orange-100">Cases Resolved</div>
            </div>

            {/* What's New Section */}
            <div className="bg-white rounded-lg overflow-hidden shadow-md">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 font-bold">
                📢 Latest Updates
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <p className="text-gray-700">New reporting categories added for social media fraud</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <p className="text-gray-700">Mobile app now available on Play Store</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <p className="text-gray-700">Awareness campaign launched in 15 states</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Banner */}
          <div className="mt-8 bg-gradient-to-r from-orange-500 via-white to-green-600 rounded-lg p-8 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/1200px-Emblem_of_India.svg.png" 
                alt="Emblem" 
                className="h-20"
              />
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Digital India Initiative</h3>
                <p className="text-gray-700">Building a safe and secure digital ecosystem for every citizen</p>
              </div>
            </div>
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Flag_of_India.png/1200px-Flag_of_India.png" 
              alt="Indian Flag" 
              className="h-24"
            />
          </div>
        </div>
      </div>
    </div>
  );
}