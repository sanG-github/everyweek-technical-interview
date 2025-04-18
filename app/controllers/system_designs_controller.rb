class SystemDesignsController < ApplicationController
  before_action :apply_rate_limit, only: [ :api_demo ]

  def index
    @system_designs = [
      { name: "Rate Limiting", path: system_designs_rate_limiting_path, description: "Implementing rate limiting mechanisms to control API access" },
      { name: "Partitioning", path: system_designs_partitioning_path, description: "Database partitioning strategies for scaling" },
      { name: "Sharding", path: system_designs_sharding_path, description: "Database sharding techniques for horizontal scaling" }
    ]
  end

  def rate_limiting
    # Track attempts for demo purposes
    session[:api_attempts] ||= []
  end

  def api_demo
    # This is our "API endpoint" that is being rate limited
    session[:api_attempts] ||= []
    session[:api_attempts] << Time.now

    render json: {
      message: "API request successful",
      timestamp: Time.now,
      request_count: session[:api_attempts].size
    }
  end

  def reset_rate_limit
    session[:api_attempts] = []
    redirect_to system_designs_rate_limiting_path, notice: "Rate limit counter has been reset"
  end

  def partitioning
  end

  def sharding
  end

  private

  def apply_rate_limit
    # Implementation of token bucket algorithm
    session[:api_attempts] ||= []

    # Configuration
    max_requests = 5           # Maximum tokens in the bucket
    refill_rate = 1            # Tokens added per second
    window_size = 60           # Window size in seconds

    # Clean old requests outside the window
    current_time = Time.now
    session[:api_attempts].reject! { |time| (current_time - time) > window_size }

    # Get count of requests within window
    request_count = session[:api_attempts].size

    # Calculate allowed requests based on refill rate and time elapsed since first request
    if request_count > 0
      first_request_time = session[:api_attempts].first
      time_elapsed = [ current_time - first_request_time, 0 ].max
      allowed_requests = [ max_requests, (time_elapsed * refill_rate).to_i ].min

      # If more requests than allowed, reject
      if request_count >= max_requests
        rate_limit_header = {
          "X-RateLimit-Limit" => max_requests.to_s,
          "X-RateLimit-Remaining" => "0",
          "X-RateLimit-Reset" => (window_size - (current_time - first_request_time)).to_i.to_s
        }

        render json: {
          error: "Rate limit exceeded. Try again later.",
          retry_after: (window_size - (current_time - first_request_time)).to_i
        }, status: :too_many_requests, headers: rate_limit_header
        nil
      end
    end
  end
end
