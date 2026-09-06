/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext.tsx";
import Navbar from "../../components/Navbar.tsx";
import Footer from "../../components/Footer.tsx";
import Loader from "../../components/Loader.tsx";
import { CalendarIcon, SettingsIcon } from "lucide-react";
import RestaurantWizard from "../../components/owner/RestaurantWizard.tsx";
import PendingApproval from "../../components/owner/PendingApproval.tsx";
import RequestRejected from "../../components/owner/RequestRejected.tsx";
import OwnerBookings from "../../components/owner/OwnerBookings.tsx";
import OwnerProfileDetails from "../../components/owner/OwnerProfileDetails.tsx";
import api from "../../lib/api.ts";
import toast from "react-hot-toast";

export default function OwnerDashboard() {
    const { logout } = useAppContext();

    const [restaurant, setRestaurant] = useState<any>(null);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"bookings" | "details">("bookings");

    const fetchOwnerData = async () => {
        try {
            setLoading(true);

            // Get owner restaurant
            const res = await api.get("/owner/restaurant");

            console.log("OWNER RESTAURANT API RESPONSE:", res.data);

            // Handle both:
            // { name: "...", status: "Approved" }
            // and
            // { restaurant: { name: "...", status: "Approved" } }
            const restaurantData = res.data?.restaurant || res.data || null;

            console.log("NORMALIZED RESTAURANT:", restaurantData);

            setRestaurant(restaurantData);

            // Only fetch bookings for an approved restaurant
            // if (restaurantData?.status === "Approved") {
            //     const bookingsRes = await api.get("/owner/bookings");

            //     console.log("OWNER BOOKINGS API RESPONSE:", bookingsRes.data);

            //     // Handle both array and { bookings: [] }
            //     const bookingsData =
            //         Array.isArray(bookingsRes.data)
            //             ? bookingsRes.data
            //             : bookingsRes.data?.bookings || [];

            //     setBookings(bookingsData);
            // } else {
            //     setBookings([]);
            // }

                    const bookingsRes = await api.get("/owner/bookings");

        console.log("OWNER BOOKINGS API RESPONSE:", bookingsRes.data);

        const bookingsData =
            Array.isArray(bookingsRes.data)
                ? bookingsRes.data
                : bookingsRes.data?.bookings || [];

        setBookings(bookingsData);

        } catch (error: any) {
            console.error("OWNER DASHBOARD ERROR:", error);

            toast.error(
                error?.response?.data?.message ||
                error?.message ||
                "Failed to load owner data"
            );

            setRestaurant(null);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOwnerData();
    }, []);

    // Loading
    if (loading) {
        return <Loader text="Loading Owner Dashboard..." />;
    }

    return (
        <div className="min-h-screen bg-surface flex flex-col pt-20">

            <Navbar />

            <main className="grow max-w-7xl w-full mx-auto px-6 md:px-10 py-12">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant/10 pb-8 mb-8">

                    <div>
                        <h1 className="font-display text-2xl md:text-3xl text-primary">
                            Restaurant Portal
                        </h1>

                        <p className="text-xs text-black/55 mt-1.5">
                            Review capacity limits and process live reservations.
                        </p>
                    </div>

                    <button
                        onClick={logout}
                        className="bg-error-container hover:bg-error-container/85 text-error px-4 py-2 text-[10px] font-medium tracking-widest uppercase transition-colors"
                    >
                        Sign Out
                    </button>

                </div>

                {/* No restaurant */}
                {!restaurant ? (

                    <RestaurantWizard
                        setRestaurant={setRestaurant}
                    />

                ) : restaurant.status === "Pending" ? (

                    /* Pending */
                    <PendingApproval
                        restaurant={restaurant}
                    />

                ) : restaurant.status === "Rejected" ? (

                    /* Rejected */
                    <RequestRejected
                        restaurantName={restaurant?.name || "Restaurant"}
                    />

                ) : restaurant.status === "Approved" ? (

                    /* APPROVED RESTAURANT */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                        {/* Sidebar */}
                        <aside className="lg:col-span-3 space-y-6 bg-white border border-outline-variant/20 p-6 rounded-md shadow-sm h-fit">

                            {/* Restaurant header */}
                            <div className="flex items-center gap-3.5 border-b border-outline-variant/10 pb-5">

                                <span className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium text-base">

                                    {restaurant?.name
                                        ? restaurant.name.charAt(0).toUpperCase()
                                        : "R"}

                                </span>

                                <div className="min-w-0">

                                    <h4 className="font-display font-medium text-primary text-base line-clamp-1">

                                        {restaurant?.name || "Restaurant"}

                                    </h4>

                                    <span className="text-[9px] text-secondary tracking-widest uppercase bg-secondary-container/20 px-2 py-0.5 rounded-sm inline-block mt-0.5">

                                        APPROVED

                                    </span>

                                </div>

                            </div>

                            {/* Navigation */}
                            <nav className="flex flex-col gap-1.5">

                                {/* Bookings */}
                                <button
                                    onClick={() => setActiveTab("bookings")}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-medium tracking-wider uppercase text-left rounded-sm cursor-pointer transition-colors ${
                                        activeTab === "bookings"
                                            ? "bg-primary text-white"
                                            : "text-black/55 hover:bg-surface"
                                    }`}
                                >

                                    <CalendarIcon size={14} />

                                    Bookings ({bookings.length})

                                </button>

                                {/* Profile Details */}
                                <button
                                    onClick={() => setActiveTab("details")}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-medium tracking-wider uppercase text-left rounded-sm cursor-pointer transition-colors ${
                                        activeTab === "details"
                                            ? "bg-primary text-white"
                                            : "text-black/55 hover:bg-surface"
                                    }`}
                                >

                                    <SettingsIcon size={14} />

                                    Profile Details

                                </button>

                            </nav>

                        </aside>

                        {/* Main panel */}
                        <div className="lg:col-span-9 space-y-8">

                            {activeTab === "bookings" && (

                                <OwnerBookings
                                    bookings={bookings}
                                    setBookings={setBookings}
                                    totalSeats={restaurant?.totalSeats || 0}
                                />

                            )}

                            {activeTab === "details" && (

                                <OwnerProfileDetails
                                    restaurant={restaurant}
                                    setRestaurant={setRestaurant}
                                />

                            )}

                        </div>

                    </div>

                ) : (

                    /* Unknown status */
                    <div className="bg-white border border-outline-variant/20 rounded-md p-10 text-center shadow-sm">

                        <h2 className="font-display text-2xl text-primary">
                            Restaurant Status
                        </h2>

                        <p className="text-sm text-black/55 mt-3">
                            The restaurant data was received, but the status
                            could not be determined.
                        </p>

                        <p className="font-medium text-primary mt-2">
                            Status: {restaurant?.status || "Missing"}
                        </p>

                        <button
                            onClick={fetchOwnerData}
                            className="mt-6 bg-primary text-white px-5 py-2.5 text-xs uppercase tracking-widest"
                        >
                            Retry
                        </button>

                    </div>

                )}

            </main>

            <Footer />

        </div>
    );
}