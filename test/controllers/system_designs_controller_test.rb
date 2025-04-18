require "test_helper"

class SystemDesignsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get system_designs_index_url
    assert_response :success
  end

  test "should get rate_limiting" do
    get system_designs_rate_limiting_url
    assert_response :success
  end

  test "should get partitioning" do
    get system_designs_partitioning_url
    assert_response :success
  end

  test "should get sharding" do
    get system_designs_sharding_url
    assert_response :success
  end
end
