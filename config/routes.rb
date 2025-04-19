Rails.application.routes.draw do
  # System designs overview
  get "system_designs", to: "system_designs#index", as: :system_designs
  get "system_designs/partitioning", as: :system_designs_partitioning
  get "system_designs/sharding", as: :system_designs_sharding

  # Rate limiting dedicated controller
  get "rate_limiting", to: "rate_limiting#index", as: :rate_limiting
  post "rate_limiting", to: "rate_limiting#create", as: :rate_limiting_api
  post "rate_limiting/reset", to: "rate_limiting#reset", as: :rate_limiting_reset

  # Sliding window rate limiting
  post "rate_limiting/sliding_window", to: "rate_limiting#sliding_window", as: :rate_limiting_sliding_window
  post "rate_limiting/sliding_window/reset", to: "rate_limiting#reset_sliding_window", as: :rate_limiting_reset_sliding_window
  get "sliding-window-counter.svg", to: "rate_limiting#sliding_window_diagram"

  # Consistent Hashing routes
  get "consistent_hashing", to: "consistent_hashing#index", as: :consistent_hashing

  resources :posts
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  root "home#index"
end
