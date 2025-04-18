class RateLimitingController < ApplicationController
  include RateLimitCacheManager

  RATE_LIMIT = 4
  RATE_LIMIT_DURATION = 30.seconds

  before_action :set_rate_limit_status, only: [ :index ]

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
    update_reset_time(RATE_LIMIT_DURATION)

    respond_to do |format|
      format.turbo_stream do
        flash.now[:api_message] = "API request successful (#{response_time}ms)"
        flash.now[:api_error] = false
        @status = rate_limit_status(RATE_LIMIT)
        render "create"
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
        render "reset"
      end
      format.json { render json: { success: true, message: "Counter reset successfully" } }
      format.html {
        flash[:api_message] = "Counter reset successfully"
        redirect_to rate_limiting_path and return
      }
    end
  end

  private

  def handle_rate_limit_exceeded
    update_reset_time(RATE_LIMIT_DURATION)

    respond_to do |format|
      format.turbo_stream do
        flash.now[:api_message] = "Rate limited! Try again in #{seconds_until_reset} seconds."
        flash.now[:api_error] = true
        @status = rate_limit_status(RATE_LIMIT)
        render "rate_limited"
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
end
