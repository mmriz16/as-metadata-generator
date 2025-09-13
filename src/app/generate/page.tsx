'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Platform = 'adobe' | 'shutterstock';

interface UploadedFile {
  filename: string;
  status: string;
  file?: File;
  preview?: string;
}

export default function GeneratePage() {
  const [items, setItems] = useState<UploadedFile[]>([]);
  const [platform, setPlatform] = useState<Platform>('adobe');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Load uploaded files from localStorage
    const savedItems = localStorage.getItem('uploadedFiles');
    if (savedItems) {
      const parsedItems = JSON.parse(savedItems);
      setItems(parsedItems);
    } else {
      // If no files, redirect to home
      router.push('/');
    }
  }, [router]);

  const handleGenerate = async () => {
    if (items.length === 0) return;
    
    // Check if API key is available
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      alert('Please set your OpenAI API key in Settings first.');
      router.push('/settings');
      return;
    }
    
    setLoading(true);
    try {
      const apiEndpoint = platform === "adobe" ? "/api/metadata" : "/api/shutterstock-metadata";
      const filenames = items.map(item => item.filename);
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openai-api-key': apiKey,
        },
        body: JSON.stringify({ filenames }),
      });
      
      if (response.ok) {
        const result = await response.json();
        const results = result?.data ?? [];
        localStorage.setItem('metadata_rows', JSON.stringify(results));
        localStorage.setItem('selected_platform', platform);
        
        // Calculate and save token usage
        const fileCount = items.length;
        const estimatedTokensPerFile = platform === "adobe" ? 305 : 350;
        const totalTokens = fileCount * estimatedTokensPerFile;
        const estimatedCost = totalTokens * 0.00015; // $0.00015 per 1K tokens for GPT-4o-mini
        const requestCount = fileCount * (platform === "adobe" ? 3 : 2);
        
        const tokenUsage = {
          totalTokens,
          estimatedCost,
          requestCount
        };
        localStorage.setItem('token_usage', JSON.stringify(tokenUsage));
        
        router.push('/review');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to generate metadata');
        if (response.status === 401) {
          router.push('/settings');
        }
      }
    } catch (error) {
      console.error('Error generating metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-gray-50 flex flex-col" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">No Files Found</h1>
            <p className="text-gray-600">Please upload files first.</p>
            <Button asChild>
              <Link href="/">← Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50" style={{ minHeight: 'calc(100vh - 80px)' }}>
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">Generate Metadata</h1>
          <p className="text-lg text-gray-600">
            Review your uploaded files and select platform to generate metadata
          </p>
        </div>

        {/* File Preview Grid */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-lg">📁</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {items.length} Files Uploaded
              </h2>
              <p className="text-sm text-gray-600">Ready for metadata generation</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.map((item, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                {item.preview ? (
                  <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                    <img 
                      src={item.preview} 
                      alt={item.filename}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 mx-auto mb-3 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500 text-2xl">📄</span>
                  </div>
                )}
                <p className="text-xs text-gray-700 font-medium truncate" title={item.filename}>
                  {item.filename}
                </p>
                <p className="text-xs text-green-600 mt-1">{item.status}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Selection & Generate */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8 shadow-sm">
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-blue-900 mb-2">Select Platform</h3>
              <p className="text-sm text-blue-600">Choose the platform where you want to upload these icons</p>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <label className="text-sm font-medium text-blue-900">Platform:</label>
                <select 
                  value={platform} 
                  onChange={(e) => setPlatform(e.target.value as Platform)}
                  className="px-4 py-2 border border-blue-300 rounded-lg bg-white text-sm font-medium text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-all min-w-[200px]"
                >
                  <option value="adobe">📊 Adobe Stock</option>
                  <option value="shutterstock">🖼️ Shutterstock</option>
                </select>
              </div>
              
              <Button 
                onClick={handleGenerate}
                disabled={loading}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3 text-base font-semibold"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating Metadata...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    ✨ Generate Metadata
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/">← Back to Home</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/review">Skip to Review →</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}