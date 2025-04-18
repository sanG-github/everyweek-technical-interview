module SlidingWindowRateLimiter
  extend ActiveSupport::Concern

  # Constants
  WINDOW_SIZE = 60.seconds # 1 minute window
  RATE_LIMIT = 5 # 5 requests per minute

  # Get the cache keys for the current and previous time windows
  def current_window_key
    timestamp = Time.now.to_i / WINDOW_SIZE.to_i * WINDOW_SIZE.to_i
    "rate-limit:sliding-window:#{controller_path}:#{timestamp}:#{request.domain}"
  end

  def previous_window_key
    timestamp = (Time.now.to_i / WINDOW_SIZE.to_i - 1) * WINDOW_SIZE.to_i
    "rate-limit:sliding-window:#{controller_path}:#{timestamp}:#{request.domain}"
  end

  # Expiration cache keys
  def current_window_expires_key
    "#{current_window_key}:expires_at"
  end

  def previous_window_expires_key
    "#{previous_window_key}:expires_at"
  end

  # Get the cache expiration time for the current window
  def current_window_expiration
    Rails.cache.read(current_window_expires_key)
  end

  # Calculate the rolling window request count
  def calculate_request_count
    # Get the current position in the time window (0.0 to 1.0)
    current_timestamp = Time.now.to_i
    window_start_timestamp = (current_timestamp / WINDOW_SIZE.to_i) * WINDOW_SIZE.to_i
    position_in_window = (current_timestamp - window_start_timestamp).to_f / WINDOW_SIZE.to_i

    # Get the counts from current and previous windows
    current_count = Rails.cache.read(current_window_key) || 0
    previous_count = Rails.cache.read(previous_window_key) || 0

    # Calculate the weighted count using the sliding window formula
    # current_count + previous_count * (1 - position_in_window)
    weighted_count = current_count + previous_count * (1.0 - position_in_window)

    {
      count: weighted_count.round(1),
      current_count: current_count,
      previous_count: previous_count,
      position: position_in_window.round(2),
      current_key: current_window_key,
      previous_key: previous_window_key
    }
  end

  # Increment the counter for the current window
  def increment_sliding_window
    # Calculate expiration - window size from the start of the window, not from now
    current_timestamp = Time.now.to_i
    window_start_timestamp = (current_timestamp / WINDOW_SIZE.to_i) * WINDOW_SIZE.to_i
    window_end_timestamp = window_start_timestamp + WINDOW_SIZE.to_i
    expires_in = window_end_timestamp + WINDOW_SIZE.to_i - current_timestamp

    # Use a longer expiration to allow for the overlapping window calculation
    Rails.cache.increment(current_window_key, 1, expires_in: expires_in)
    Rails.cache.write(current_window_expires_key, window_end_timestamp, expires_in: expires_in)
    calculate_request_count
  end

  # Reset sliding window counters
  def reset_sliding_window_counters
    Rails.cache.delete(current_window_key)
    Rails.cache.delete(previous_window_key)
    Rails.cache.delete(current_window_expires_key)
    Rails.cache.delete(previous_window_expires_key)
  end

  # Check if rate limit is exceeded
  def sliding_window_rate_limit_exceeded?
    calculate_request_count[:count] > RATE_LIMIT
  end

  # Get time until window rolls
  def sliding_window_reset_time
    current_timestamp = Time.now.to_i
    window_start_timestamp = (current_timestamp / WINDOW_SIZE.to_i) * WINDOW_SIZE.to_i
    window_end_timestamp = window_start_timestamp + WINDOW_SIZE.to_i

    # Time until the current window expires
    (window_end_timestamp - current_timestamp).round
  end

  # Get comprehensive status for the view
  def sliding_window_status
    status = calculate_request_count

    # Calculate expiration time based on window boundaries
    current_timestamp = Time.now.to_i
    window_start_timestamp = (current_timestamp / WINDOW_SIZE.to_i) * WINDOW_SIZE.to_i
    window_end_timestamp = window_start_timestamp + WINDOW_SIZE.to_i
    seconds_until_rollover = window_end_timestamp - current_timestamp

    # Get expiration time from cache if available
    expiration_timestamp = current_window_expiration || window_end_timestamp

    {
      count: status[:count],
      current_count: status[:current_count],
      previous_count: status[:previous_count],
      position: status[:position],
      limit: RATE_LIMIT,
      remaining: [ 0, RATE_LIMIT - status[:count] ].max.round(1),
      reset_time: seconds_until_rollover,
      window_size: WINDOW_SIZE.to_i,
      current_key: status[:current_key],
      previous_key: status[:previous_key],
      exceeded: sliding_window_rate_limit_exceeded?,
      current_window_expires_at: Time.at(expiration_timestamp),
      seconds_until_expiry: seconds_until_rollover
    }
  end
end
