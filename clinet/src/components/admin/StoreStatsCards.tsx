"use client"

import { memo } from "react"
import { Store, CheckCircle, Clock, MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StoreStats {
  totalStores: number
  verifiedStores: number
  pendingStores: number
  stateCount: number
}

interface StoreStatsCardsProps {
  stats: StoreStats
}

const StoreStatsCards = memo(({ stats }: StoreStatsCardsProps) => {
  const cards = [
    {
      title: "Total Stores",
      value: stats.totalStores,
      icon: Store,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Verified",
      value: stats.verifiedStores,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Pending Verification",
      value: stats.pendingStores,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "States Covered",
      value: stats.stateCount,
      icon: MapPin,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <Card key={card.title} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
})

StoreStatsCards.displayName = "StoreStatsCards"

export default StoreStatsCards
