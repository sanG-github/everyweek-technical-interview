class SystemDesignsController < ApplicationController
  def index
    @system_designs = [
      { name: "Rate Limiting", path: rate_limiting_path, description: "Implementing rate limiting mechanisms to control API access" },
      { name: "Partitioning", path: system_designs_partitioning_path, description: "Database partitioning strategies for scaling" },
      { name: "Sharding", path: system_designs_sharding_path, description: "Database sharding techniques for horizontal scaling" }
    ]
  end

  def partitioning
  end

  def sharding
  end
end
