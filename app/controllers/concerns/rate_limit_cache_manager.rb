module RateLimitCacheManager
  extend ActiveSupport::Concern

  # Get the cache key for rate limiting
  def rate_limit_cache_key
    @rate_limit_cache_key ||= [ "rate-limit", controller_path, nil, request.domain ].compact.join(":")
  end

  # Get the current request count
  def current_request_count
    Rails.cache.read(rate_limit_cache_key) || 0
  end

  # Get the cache expiration time
  def cache_expiration_time
    # Get expiration time using Rails cache metadata
    entry = Rails.cache.instance_variable_get(:@data)&.dig(rate_limit_cache_key.to_s)
    entry&.expires_at
  end

  # Calculate seconds until reset based on cache TTL
  def seconds_until_reset
    expires_at = cache_expiration_time
    expires_at ? (expires_at - Time.now.to_i).to_i : 0
  end

  # Increment counter and set expiration
  def increment_counter(duration = 1.minute)
    # Just increment the counter and Rails will handle the expiration
    count = Rails.cache.increment(rate_limit_cache_key, 1, expires_in: duration)
    count
  end

  # Reset counter (clear cache entry)
  def reset_rate_limit_counter
    Rails.cache.delete(rate_limit_cache_key)
  end

  # Get rate limit status info (useful for views)
  def rate_limit_status(limit = 4)
    count = current_request_count
    expires_at = cache_expiration_time
    seconds_left = expires_at ? (expires_at - Time.now.to_i).to_i : 0
    seconds_left = 0 if seconds_left < 0

    {
      count: count,
      limit: limit,
      reset_time: seconds_left,
      cache_key: rate_limit_cache_key,
      expires_at: expires_at ? Time.at(expires_at) : nil
    }
  end
end
