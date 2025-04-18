Rails.application.routes.draw do
  # System designs overview
  get "system_designs", to: "system_designs#index", as: :system_designs
  get "system_designs/partitioning", as: :system_designs_partitioning
  get "system_designs/sharding", as: :system_designs_sharding

  # Rate limiting dedicated controller
  get "rate_limiting", to: "rate_limiting#index", as: :rate_limiting
  post "rate_limiting", to: "rate_limiting#create", as: :rate_limiting_api
  post "rate_limiting/reset", to: "rate_limiting#reset", as: :rate_limiting_reset

  resources :posts
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  root "system_designs#index"
end
