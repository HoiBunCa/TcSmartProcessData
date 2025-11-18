import { useState } from 'react';
import { BarChart3, QrCode, Barcode, FileType } from 'lucide-react';

type Page = 'statistics' | 'qrcode' | 'barcode' | 'pdf';

interface LayoutProps {
  children: (page: Page) => React.ReactNode;
}

const menuItems = [
  { id: 'statistics' as Page, label: 'Thống kê', icon: BarChart3 },
  { id: 'qrcode' as Page, label: 'Đặt tên theo qrcode', icon: QrCode },
  { id: 'barcode' as Page, label: 'Đặt tên theo barcode', icon: Barcode },
  { id: 'pdf' as Page, label: 'PDF 2 lớp', icon: FileType },
];

export default function Layout({ children }: LayoutProps) {
  const [currentPage, setCurrentPage] = useState<Page>('barcode');

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">File Processing</h1>
        </div>
        <nav className="flex-1 p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        {children(currentPage)}
      </main>
    </div>
  );
}
