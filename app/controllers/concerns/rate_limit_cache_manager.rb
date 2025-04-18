module RateLimitCacheManager
  extend ActiveSupport::Concern

  # Get the cache key for rate limiting
  def rate_limit_cache_key
    @rate_limit_cache_key ||= [ "rate-limit", controller_path, nil, request.domain ].compact.join(":")
  end

  # Get the cache key for the reset timer
  def rate_limit_reset_cache_key
    @rate_limit_reset_cache_key ||= "rate-limit-reset:#{controller_path}:create:#{request.domain}"
  end

  # Get the current request count
  def current_request_count
    Rails.cache.read(rate_limit_cache_key) || 0
  end

  # Get the reset time (when the rate limit will expire)
  def rate_limit_reset_time
    Rails.cache.read(rate_limit_reset_cache_key)
  end

  # Calculate seconds until reset
  def seconds_until_reset
    reset_time = rate_limit_reset_time
    reset_time ? (reset_time - Time.now).round : 0
  end

  # Update reset time (called when a request is made)
  def update_reset_time(duration = 1.minute)
    Rails.cache.write(rate_limit_reset_cache_key, Time.now + duration, expires_in: duration)
  end

  # Reset counter (clear both cache entries)
  def reset_rate_limit_counter
    Rails.cache.delete(rate_limit_cache_key)
    Rails.cache.delete(rate_limit_reset_cache_key)
  end

  # Get rate limit status info (useful for views)
  def rate_limit_status(limit = 4)
    {
      count: current_request_count,
      limit: limit,
      reset_time: seconds_until_reset,
      cache_key: rate_limit_cache_key,
      expires_at: rate_limit_reset_time
    }
  end
end
