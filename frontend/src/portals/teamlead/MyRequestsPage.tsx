import React, { useState } from 'react'
import { TrackingStepper } from '../../components/portal/TrackingStepper'
import { FileText, RotateCcw, AlertCircle, ArrowRight } from 'lucide-react'

interface RequestItem {
  id: string
  title: string
  category: string
  quantity: number
  estCost: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Returned' | 'In Procurement' | 'Completed'
  currentStage: number
  date: string
  returnReason?: string
}

export const MyRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<RequestItem[]>([
    {
      id: 'REQ-DEMO-001',
      title: 'High Performance Laptops for Engineering Team',
      category: 'IT Hardware',
      quantity: 10,
      estCost: '$35,000.00',
      status: 'In Procurement',
      currentStage: 6,
      date: '2026-09-08',
    },
    {
      id: 'REQ-DEMO-002',
      title: 'Cloud Infrastructure Yearly Renewal',
      category: 'SaaS & Cloud',
      quantity: 1,
      estCost: '$60,000.00',
      status: 'Pending',
      currentStage: 1,
      date: '2026-09-10',
    },
    {
      id: 'REQ-DEMO-003',
      title: 'Ergonomic Desk Chairs for Ops Team',
      category: 'Furniture',
      quantity: 5,
      estCost: '$2,500.00',
      status: 'Returned',
      currentStage: 0,
      date: '2026-09-05',
      returnReason: 'Insufficient details provided regarding chair specifications and model warranty.',
    },
  ])

  const handleResubmit = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'Pending', currentStage: 1, returnReason: undefined } : r
      )
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
          <p className="text-xs text-gray-500">
            Live 10-stage tracking flow for all your submitted procurement requests.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {requests.map((req) => (
          <div key={req.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                    {req.id}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">{req.date}</span>
                </div>
                <h2 className="text-base font-bold text-gray-900 mt-1">{req.title}</h2>
                <p className="text-xs text-gray-500">
                  Category: <span className="font-semibold text-gray-700">{req.category}</span> • Qty:{' '}
                  <span className="font-semibold text-gray-700">{req.quantity}</span> • Est. Cost:{' '}
                  <span className="font-semibold text-gray-900">{req.estCost}</span>
                </p>
              </div>

              {/* Returned Alert Banner & Resubmit Action */}
              {req.status === 'Returned' && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleResubmit(req.id)}
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-lg shadow transition-all"
                  >
                    <RotateCcw size={15} /> Edit & Resubmit
                  </button>
                </div>
              )}
            </div>

            {req.status === 'Returned' && req.returnReason && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Returned Reason from Manager:</strong> {req.returnReason}
                </span>
              </div>
            )}

            {/* 10-Stage Horizontal Stepper */}
            <TrackingStepper currentStage={req.currentStage} status={req.status} />
          </div>
        ))}
      </div>
    </div>
  )
}
