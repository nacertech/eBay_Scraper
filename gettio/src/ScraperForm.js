import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ScraperForm = () => {
    const [url, setUrl] = useState('');
    const [path, setPath] = useState(''); // State for the path
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
    
        // Replace single backslash with double backslashes in the path
        const updatedPath = path.replace(/\\/g, '\\\\');
    
        try {
            // Send the updated path in the API request
            const response = await fetch(`http://localhost:8080/scrape?url=${encodeURIComponent(url)}&path=${encodeURIComponent(updatedPath)}`);
            setIsLoading(false);
            if (response.ok) {
                const result = await response.json();
                toast.success('Data fetched successfully!');
                // Set state with fetched data if needed
            } else {
                toast.error('Failed to fetch data.');
            }
        } catch (error) {
            setIsLoading(false);
            toast.error('An error occurred!');
            console.error('Error:', error);
        }
    };
    

    const handleClear = () => {
        setUrl(''); // Reset the URL state
    };

    return (
        <div className="p-4">
            <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter eBay item URL"
                    className="px-3 py-2 border border-gray-300 rounded"
                    disabled={isLoading}
                />
                <input
                    type="text"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="Enter save path"
                    className="px-3 py-2 border border-gray-300 rounded"
                    disabled={isLoading}
                />
                <div className="flex justify-between">
                    <button type="submit" className="px-3 py-2 bg-blue-500 text-white rounded" disabled={isLoading}>
                        {isLoading ? "Loading..." : "Scrape"}
                    </button>
                    <button type="button" onClick={handleClear} className="px-3 py-2 bg-red-500 text-white rounded" disabled={isLoading}>
                        Clear
                    </button>
                </div>
            </form>
            <ToastContainer position="bottom-center" />
        </div>
    );
};

export default ScraperForm;
