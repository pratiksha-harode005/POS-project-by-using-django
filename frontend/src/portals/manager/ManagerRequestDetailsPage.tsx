import React from 'react'
import { TrackingStepper } from '../../components/portal/TrackingStepper'
import { FileText, User, Calendar, Building, DollarSign, Tag, CheckCircle } from 'lucide-react'

export const ManagerRequestDetailsPage: React.FC = () => {
  const req = {
    id: 'REQ-DEMO-001',
    title: 'High Performance Laptops for Engineering Team',
    category: 'IT Hardware',
    subcategory: 'Laptops',
    description: '10 MacBook Pro 16-inch M3 Max laptops required for machine learning model development and iOS build acceleration.',
    quantity: 10,
    requiredBy: '2026-09-24',
    department: 'IT & Infrastructure',
    deliveryLocation: 'Pune HQ, 4th Floor',
    priority: 'High',
    preferredVendor: 'Dell Technologies',
    justification: 'Current development hardware is causing 35+ min build bottlenecks per PR.',
    status: 'In Procurement' as const,
    currentStage: 6,
    created_by: 'Team Lead Alex',
    total_cost: '$35,000.00',
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Request Details & Stepper Tracking</h1>
        <p className="text-xs text-gray-500">Comprehensive procurement request lifecycle & approval trail.</p>
      </div>

      {/* 10-Stage Horizontal Stepper */}
      <TrackingStepper currentStage={req.currentStage} status={req.status} />

      {/* Request Details Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex justify-between items-start mb-4 pb-4 border-b">
          <div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              {req.id}
            </span>
            <h2 className="text-xl font-bold text-gray-900 mt-2">{req.title}</h2>
          </div>
          <span className="text-lg font-black text-gray-900">{req.total_cost}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div>
            <span className="text-gray-500 font-semibold block">Category</span>
            <span className="font-bold text-gray-900">{req.category} / {req.subcategory}</span>
          </div>
          <div>
            <span className="text-gray-500 font-semibold block">Department</span>
            <span className="font-bold text-gray-900">{req.department}</span>
          </div>
          <div>
            <span className="text-gray-500 font-semibold block">Priority</span>
            <span className="font-bold text-red-600">{req.priority}</span>
          </div>
          <div>
            <span className="text-gray-500 font-semibold block">Required By</span>
            <span className="font-bold text-gray-900">{req.requiredBy}</span>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <h4 className="font-bold text-gray-800">Description</h4>
            <p className="text-gray-600 mt-0.5">{req.description}</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-800">Business Justification</h4>
            <p className="text-gray-600 mt-0.5">{req.justification}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
