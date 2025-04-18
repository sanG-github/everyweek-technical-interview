class SystemDesignsController < ApplicationController
  def index
    @system_designs = [
      { name: "Rate Limiting", path: rate_limiting_path, description: "Implementing rate limiting mechanisms to control API access" },
      { name: "Consistent Hashing", path: consistent_hashing_path, description: "A distributed hashing technique that minimizes remapping when servers are added or removed" },
      { name: "Partitioning", path: system_designs_partitioning_path, description: "Database partitioning strategies for scaling" },
      { name: "Sharding", path: system_designs_sharding_path, description: "Database sharding techniques for horizontal scaling" }
    ]
  end

  def partitioning
  end

  def sharding
  end
end
