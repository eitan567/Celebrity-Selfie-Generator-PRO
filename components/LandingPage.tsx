import React from 'react';
import { Icon } from './Icons';

interface LandingPageProps {
    onLogin: () => void;
}

const FeatureCard: React.FC<{ icon: string; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-white/50 backdrop-blur-sm p-6 rounded-xl border border-white/20 shadow-lg">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white mb-4">
            <Icon name={icon} size={24} />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{children}</p>
    </div>
);

const GalleryImage: React.FC<{ src: string, alt: string, className?: string }> = ({ src, alt, className }) => (
    <div className={`relative overflow-hidden rounded-xl shadow-2xl group ${className}`}>
        <img src={src} alt={alt} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute inset-0 bg-black/20"></div>
    </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
    return (
        <div className="bg-gray-50 text-gray-800">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-sm z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-2">
                             <Icon name="Sparkles" className="text-yellow-500" size={24}/>
                             <span className="font-bold text-xl">סטודיו AI PRO</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <a href="#features" className="text-sm font-bold text-gray-600 hover:text-yellow-600">תכונות</a>
                            <a href="#gallery" className="text-sm font-bold text-gray-600 hover:text-yellow-600">גלריה</a>
                            <button onClick={onLogin} className="bg-yellow-500 text-white font-bold text-sm px-5 py-2 rounded-full hover:bg-yellow-600 transition-colors shadow-md">התחברות</button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="pt-16">
                <section className="relative py-20 sm:py-32 bg-gradient-to-br from-yellow-50 to-orange-100 overflow-hidden">
                     <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom_1px_center"></div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight">
                            הפוך כל תמונה ליצירת מופת
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600">
                            השתמש בכוח של AI כדי לשלב את עצמך בכל סצנה שתרצה. בחר תבנית, העלה תמונה, ותן לקסם להתחיל.
                        </p>
                        <div className="mt-8 flex justify-center gap-4">
                            <button onClick={onLogin} className="bg-gray-900 text-white font-bold text-lg px-8 py-4 rounded-full hover:bg-gray-800 transition-colors shadow-xl flex items-center gap-2">
                                <Icon name="Wand2" size={20}/>
                                התחל ליצור בחינם
                            </button>
                        </div>
                    </div>
                </section>

                 {/* Features Section */}
                <section id="features" className="py-20 sm:py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                             <h2 className="text-3xl font-bold text-gray-900">כל מה שצריך כדי ליצור תמונות מדהימות</h2>
                             <p className="mt-4 text-gray-500">כלים מתקדמים עם ממשק פשוט ונוח.</p>
                        </div>
                        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            <FeatureCard icon="LayoutGrid" title="תבניות מוכנות">
                                בחר מתוך מגוון רחב של תבניות פרומפט מוכנות מראש לכל מטרה, מסלפי עם מפורסמים ועד למסע בזמן.
                            </FeatureCard>
                             <FeatureCard icon="List" title="יצירה בכמויות">
                                הכן רשימה של סצינות וצור את כולן בלחיצת כפתור אחת. חסוך זמן יקר וקבל תוצאות מרובות במהירות.
                            </FeatureCard>
                             <FeatureCard icon="Edit" title="עריכה ודיוק">
                                לא מרוצה מהתוצאה? תקן וערוך את התמונה שנוצרה עם הנחיות טקסט פשוטות עד שתהיה מושלמת.
                            </FeatureCard>
                        </div>
                    </div>
                </section>

                 {/* Gallery Section */}
                <section id="gallery" className="py-20 sm:py-24 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                         <div className="text-center mb-12">
                             <h2 className="text-3xl font-bold text-gray-900">הדמיון הוא הגבול היחיד</h2>
                             <p className="mt-4 text-gray-500">ראה מה המשתמשים שלנו יוצרים עם סטודיו AI PRO.</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <GalleryImage src="https://images.pexels.com/photos/843700/pexels-photo-843700.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" alt="אישה מצלמת סלפי עם גמל" className="col-span-2 row-span-2" />
                            <GalleryImage src="https://images.pexels.com/photos/7621955/pexels-photo-7621955.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" alt="אישה בתלבושת תקופתית" />
                            <GalleryImage src="https://images.pexels.com/photos/3771836/pexels-photo-3771836.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" alt="אישה בשמלת ערב באירוע יוקרתי" />
                            <GalleryImage src="https://images.pexels.com/photos/5904918/pexels-photo-5904918.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" alt="אישה במדי טייסת" />
                            <GalleryImage src="https://images.pexels.com/photos/7319113/pexels-photo-7319113.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" alt="אישה בסגנון סייברפאנק עתידני" />
                        </div>
                    </div>
                </section>

                 {/* Final CTA */}
                <section className="bg-white">
                    <div className="max-w-4xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
                        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                            <span className="block">מוכן להתחיל ליצור?</span>
                        </h2>
                        <p className="mt-4 text-lg leading-6 text-gray-500">
                            פתח חשבון בחינם והצטרף לאלפי יוצרים שכבר מגשימים את החזון שלהם.
                        </p>
                        <button onClick={onLogin} className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-full text-white bg-gray-900 hover:bg-gray-800 sm:w-auto">
                            התחל עכשיו
                        </button>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-gray-100 border-t">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
                    <p>&copy; {new Date().getFullYear()} סטודיו AI PRO. כל הזכויות שמורות.</p>
                </div>
            </footer>
        </div>
    );
};
