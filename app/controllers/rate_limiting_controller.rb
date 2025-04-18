class RateLimitingController < ApplicationController
  # Use Rails 8's native rate limiting for API endpoints
  # Following the specified configuration with custom response handler
  rate_limit to: 4,
             within: 1.minute,
             by: -> { request.domain },
             with: -> {
               # Store last request time in cache to calculate accurate reset time
               Rails.cache.write("rate-limit-reset:rate_limiting:create:#{request.domain}", Time.now + 1.minute, expires_in: 1.minute)

               # Cache the current count explicitly for display
               count = Rails.cache.read("rate-limit:rate_limiting:create:#{request.domain}") || 0

               # Custom response handler for rate limiting
               respond_to do |format|
                 format.turbo_stream do
                   reset_time = (Rails.cache.read("rate-limit-reset:rate_limiting:create:#{request.domain}") - Time.now).round
                   flash.now[:api_message] = "Rate limited! Try again in #{reset_time} seconds."
                   flash.now[:api_error] = true
                   render "rate_limited"
                 end
                 format.json {
                   reset_time = (Rails.cache.read("rate-limit-reset:rate_limiting:create:#{request.domain}") - Time.now).round
                   render json: { error: "Rate limited", reset_in: reset_time }, status: :too_many_requests
                 }
                 format.html {
                   reset_time = (Rails.cache.read("rate-limit-reset:rate_limiting:create:#{request.domain}") - Time.now).round
                   flash[:api_message] = "Rate limited! Try again in #{reset_time} seconds."
                   flash[:api_error] = true
                   redirect_to rate_limiting_path and return
                 }
               end
             },
             only: :create

  def index
    # Reset flash messages on page load
    flash.now[:api_message] = nil
    flash.now[:api_error] = nil
  end

  def create
    # Simulate API behavior
    response_time = rand(50..200)
    sleep(0.1) # Simulate network latency

    # Explicitly access the rate limit cache key to ensure we see the incremented value
    # that the rate_limit DSL will use internally
    cache_key = [ "rate-limit", controller_path, nil, request.domain ].compact.join(":")

    # We don't need to increment here since the rate_limit method will do it
    # But we need to read the updated value for display
    current_count = Rails.cache.read(cache_key)

    # Store last request time in cache
    Rails.cache.write("rate-limit-reset:rate_limiting:create:#{request.domain}", Time.now + 1.minute, expires_in: 1.minute)

    respond_to do |format|
      format.turbo_stream do
        flash.now[:api_message] = "API request successful (#{response_time}ms)"
        flash.now[:api_error] = false
        render "create" # Explicitly render the create template
      end
      format.json { render json: { success: true, response_time: response_time } }
      format.html {
        flash[:api_message] = "API request successful (#{response_time}ms)"
        redirect_to rate_limiting_path and return
      }
    end
  end

  def reset
    # Reset the rate limiting counter for demo purposes
    # Build the cache key the same way Rails does internally
    cache_key = [ "rate-limit", controller_path, nil, request.domain ].compact.join(":")
    Rails.cache.delete(cache_key)

    # Also delete the reset time
    Rails.cache.delete("rate-limit-reset:rate_limiting:create:#{request.domain}")

    respond_to do |format|
      format.turbo_stream do
        flash.now[:api_message] = "Counter reset successfully"
        flash.now[:api_error] = false
        render "reset" # Explicitly render the reset template
      end
      format.json { render json: { success: true, message: "Counter reset successfully" } }
      format.html {
        flash[:api_message] = "Counter reset successfully"
        redirect_to rate_limiting_path and return
      }
    end
  end
end
