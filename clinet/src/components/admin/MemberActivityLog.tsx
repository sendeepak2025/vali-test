"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import {
  Activity, User, Shield, Clock, CheckCircle2, XCircle, Edit,
  LogIn, LogOut, Key, Settings, AlertCircle, Loader2
} from "lucide-react"

interface ActivityLog {
  action: string
  description: string
  performedBy?: string
  performedByName?: string
  createdAt: string
  metadata?: any
  ipAddress?: string
}

interface MemberActivityLogProps {
  member: {
    activityLogs?: ActivityLog[]
    createdAt?: string
    name?: string
    email?: string
  }
}

const MemberActivityLog = ({ member }: MemberActivityLogProps) => {
  const getActionIcon = (action: string) => {
    const icons: Record<string, any> = {
      member_created: <User className="h-4 w-4 text-green-500" />,
      member_updated: <Edit className="h-4 w-4 text-blue-500" />,
      permission_updated: <Shield className="h-4 w-4 text-purple-500" />,
      status_updated: <Settings className="h-4 w-4 text-orange-500" />,
      login: <LogIn className="h-4 w-4 text-green-500" />,
      logout: <LogOut className="h-4 w-4 text-gray-500" />,
      password_changed: <Key className="h-4 w-4 text-red-500" />,
      password_reset: <Key className="h-4 w-4 text-yellow-500" />,
    }
    return icons[action] || <Activity className="h-4 w-4 text-gray-500" />
  }

  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      member_created: "bg-green-100 text-green-700",
      member_updated: "bg-blue-100 text-blue-700",
      permission_updated: "bg-purple-100 text-purple-700",
      status_updated: "bg-orange-100 text-orange-700",
      login: "bg-green-100 text-green-700",
      logout: "bg-gray-100 text-gray-700",
      password_changed: "bg-red-100 text-red-700",
      password_reset: "bg-yellow-100 text-yellow-700",
    }
    return styles[action] || "bg-gray-100 text-gray-700"
  }

  const formatAction = (action: string) => {
    return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  // Combine activity logs with creation event
  const allActivities: ActivityLog[] = [
    ...(member.activityLogs || []),
    {
      action: "member_created",
      description: "Account created",
      createdAt: member.createdAt || new Date().toISOString(),
      performedByName: "System",
    }
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (allActivities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No activity recorded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-blue-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{allActivities.length}</p>
            <p className="text-sm text-blue-600">Total Activities</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-700">
              {allActivities.filter(a => a.action === "login").length}
            </p>
            <p className="text-sm text-green-600">Logins</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-700">
              {allActivities.filter(a => a.action.includes("permission") || a.action.includes("updated")).length}
            </p>
            <p className="text-sm text-purple-600">Changes</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        <div className="space-y-4">
          {allActivities.map((activity, idx) => (
            <div key={idx} className="relative pl-10">
              <div className="absolute left-2 w-5 h-5 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
                {getActionIcon(activity.action)}
              </div>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getActionBadge(activity.action)}>
                          {formatAction(activity.action)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {format(new Date(activity.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                        </span>
                      </div>
                      <p className="text-gray-700">{activity.description}</p>
                      {activity.performedByName && (
                        <p className="text-sm text-gray-500 mt-1">
                          By: {activity.performedByName}
                        </p>
                      )}
                      {activity.ipAddress && (
                        <p className="text-xs text-gray-400 mt-1">
                          IP: {activity.ipAddress}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MemberActivityLog