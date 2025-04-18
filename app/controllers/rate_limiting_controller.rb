class RateLimitingController < ApplicationController
  include RateLimitCacheManager
  include SlidingWindowRateLimiter

  RATE_LIMIT = 4
  RATE_LIMIT_DURATION = 60.seconds

  before_action :set_rate_limit_status, only: [ :index ]
  before_action :set_sliding_window_status, only: [ :index ]

  rate_limit to: RATE_LIMIT,
             within: RATE_LIMIT_DURATION,
             by: -> { request.domain },
             with: -> { handle_rate_limit_exceeded },
             only: :create

  def index
    flash.now[:api_message] = nil
    flash.now[:api_error] = nil
  end

  def create
    response_time = rand(50..200)
    sleep(0.1)
    # Rails natively handles the rate limiting with rate_limit directive
    # increment_counter(RATE_LIMIT_DURATION) - removing manual increment

    respond_to do |format|
      format.turbo_stream do
        flash.now[:api_message] = "API request successful (#{response_time}ms)"
        flash.now[:api_error] = false
        @status = rate_limit_status(RATE_LIMIT)
        render "rate_limiting/default/create"
      end
      format.json { render json: { success: true, response_time: response_time } }
      format.html {
        flash[:api_message] = "API request successful (#{response_time}ms)"
        redirect_to rate_limiting_path and return
      }
    end
  end

  def reset
    reset_rate_limit_counter

    respond_to do |format|
      format.turbo_stream do
        flash.now[:api_message] = "Counter reset successfully"
        flash.now[:api_error] = false
        @status = reset_data
        render "rate_limiting/default/reset"
      end
      format.json { render json: { success: true, message: "Counter reset successfully" } }
      format.html {
        flash[:api_message] = "Counter reset successfully"
        redirect_to rate_limiting_path and return
      }
    end
  end

  def sliding_window
    status = increment_sliding_window
    response_time = rand(50..200)
    sleep(0.1)

    if sliding_window_rate_limit_exceeded?
      handle_sliding_window_rate_limit_exceeded
    else
      respond_to do |format|
        format.turbo_stream do
          flash.now[:api_message] = "API request successful (#{response_time}ms)"
          flash.now[:api_error] = false
          @sliding_window_status = sliding_window_status
          render "rate_limiting/sliding_window/create"
        end
        format.json { render json: { success: true, response_time: response_time } }
        format.html {
          flash[:api_message] = "API request successful (#{response_time}ms)"
          redirect_to rate_limiting_path and return
        }
      end
    end
  end

  def reset_sliding_window
    reset_sliding_window_counters

    respond_to do |format|
      format.turbo_stream do
        flash.now[:api_message] = "Sliding window counter reset successfully"
        flash.now[:api_error] = false
        @sliding_window_status = sliding_window_status
        render "rate_limiting/sliding_window/reset"
      end
      format.json { render json: { success: true, message: "Sliding window counter reset successfully" } }
      format.html {
        flash[:api_message] = "Sliding window counter reset successfully"
        redirect_to rate_limiting_path and return
      }
    end
  end

  def sliding_window_diagram
    send_file Rails.root.join("app", "assets", "images", "sliding-window-counter.svg"),
              type: "image/svg+xml",
              disposition: "inline"
  end

  private

  def handle_rate_limit_exceeded
    respond_to do |format|
      format.turbo_stream do
        flash.now[:api_message] = "Rate limited! Try again in #{seconds_until_reset} seconds."
        flash.now[:api_error] = true
        @status = rate_limit_status(RATE_LIMIT)
        render "rate_limiting/default/rate_limited"
      end
      format.json {
        render json: {
          error: "Rate limited",
          reset_in: seconds_until_reset
        }, status: :too_many_requests
      }
      format.html {
        flash[:api_message] = "Rate limited! Try again in #{seconds_until_reset} seconds."
        flash[:api_error] = true
        redirect_to rate_limiting_path and return
      }
    end
  end

  def handle_sliding_window_rate_limit_exceeded
    respond_to do |format|
      format.turbo_stream do
        flash.now[:api_message] = "Sliding window rate limited! Try again in #{sliding_window_reset_time} seconds."
        flash.now[:api_error] = true
        @sliding_window_status = sliding_window_status
        render "rate_limiting/sliding_window/rate_limited"
      end
      format.json {
        render json: {
          error: "Sliding window rate limited",
          reset_in: sliding_window_reset_time,
          status: sliding_window_status
        }, status: :too_many_requests
      }
      format.html {
        flash[:api_message] = "Sliding window rate limited! Try again in #{sliding_window_reset_time} seconds."
        flash[:api_error] = true
        redirect_to rate_limiting_path and return
      }
    end
  end

  def reset_data
    {
      count: 0,
      limit: RATE_LIMIT,
      reset_time: 0,
      cache_key: rate_limit_cache_key,
      expires_at: nil
    }
  end

  def set_rate_limit_status
    @rate_limit_status = rate_limit_status(RATE_LIMIT)
  end

  def set_sliding_window_status
    @sliding_window_status = sliding_window_status
  end
end
